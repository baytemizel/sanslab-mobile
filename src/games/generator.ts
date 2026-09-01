/**
 * Sayı üretim motoru / Number generation engine
 *
 * ────────────────────────────────────────────────────────────────────────
 * DÜRÜSTLÜK NOTU / HONESTY NOTE
 * Piyango çekilişleri bağımsız ve (adil varsayımıyla) düzgün dağılımlıdır.
 * Buradaki hiçbir "akıllı" mod kazanma olasılığını ARTIRMAZ. "Dengeli" ve
 * "frekans ağırlıklı" modlar yalnızca üretilen kombinasyonların görsel /
 * estetik dağılımını değiştirir. Kullanıcıya UI'da bu açıkça belirtilir.
 *
 * Lottery draws are independent and (assuming fairness) uniform. None of the
 * "smart" modes here IMPROVES odds. They only change the cosmetic spread of
 * the generated combination. This is surfaced clearly in the UI.
 * ────────────────────────────────────────────────────────────────────────
 */

import * as Crypto from "expo-crypto";
import { GameDef, Pool } from "./config";
import { selectLowShare } from "./popularity";
import { formulaGenerate, formulaExtra } from "./formula";
import { hasFormula } from "./fstats";

export type GenMode = "random" | "balanced" | "lowshare" | "formula";

export interface GeneratedPool {
  id: Pool["id"];
  labelKey: string;
  numbers: number[];
  min: number;
  max: number;
}

export interface Coupon {
  /** unique id for list keys & saving */
  uid: string;
  gameId: string;
  pools: GeneratedPool[];
  mode: GenMode;
  createdAt: number;
  /** ŞansFormülü modunda bileşik skor */
  score?: number;
}

/* ----------------------------- RNG ----------------------------- */

/**
 * Kriptografik olarak güçlü rastgelelik (mümkünse). expo-crypto /
 * global.crypto yoksa Math.random'a düşer. Modülo sapmasını önlemek için
 * reddetme örneklemesi (rejection sampling) kullanılır.
 */
function secureRandomInt(minInclusive: number, maxInclusive: number): number {
  const range = maxInclusive - minInclusive + 1;
  if (range <= 0) throw new Error("Invalid range");

  const maxUint32 = 0xffffffff;
  // Largest multiple of range that fits, to avoid modulo bias.
  const limit = maxUint32 - (maxUint32 % range);
  const buf = new Uint32Array(1);

  // 1) expo-crypto (works on iOS/Android/Hermes), 2) Web Crypto, 3) Math.random.
  const fill = ((): ((b: Uint32Array) => void) | null => {
    if (typeof Crypto?.getRandomValues === "function") {
      return (b) => Crypto.getRandomValues(b);
    }
    const g: any = globalThis as any;
    if (g.crypto && typeof g.crypto.getRandomValues === "function") {
      return (b) => g.crypto.getRandomValues(b);
    }
    return null;
  })();

  if (fill) {
    let x = 0;
    do {
      fill(buf);
      x = buf[0];
    } while (x >= limit);
    return minInclusive + (x % range);
  }

  // Fallback (entertainment-grade; odds are unaffected either way).
  return minInclusive + Math.floor(Math.random() * range);
}

/* ------------------------ Core unique pick ------------------------ */

/** Bir havuzdan `count` adet benzersiz sayı seç (Fisher-Yates partial). */
function pickUnique(
  min: number,
  max: number,
  count: number,
  weights?: Map<number, number>
): number[] {
  const size = max - min + 1;
  if (count > size) throw new Error("count exceeds pool size");

  // Weighted draw (without replacement) when weights provided
  if (weights && weights.size > 0) {
    return weightedPickUnique(min, max, count, weights);
  }

  // Uniform draw without replacement via partial Fisher–Yates shuffle.
  const pool = Array.from({ length: size }, (_, i) => min + i);
  for (let i = 0; i < count; i++) {
    const j = i + secureRandomInt(0, size - 1 - i);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

function weightedPickUnique(
  min: number,
  max: number,
  count: number,
  weights: Map<number, number>
): number[] {
  const candidates: number[] = [];
  const w: number[] = [];
  for (let n = min; n <= max; n++) {
    candidates.push(n);
    // base weight 1 so every number is always possible
    w.push(1 + (weights.get(n) ?? 0));
  }
  const chosen: number[] = [];
  for (let k = 0; k < count; k++) {
    const total = w.reduce((s, x) => s + x, 0);
    // pick a float in [0,total) using secure int over a fine grid
    const grid = 1_000_000;
    const r = (secureRandomInt(0, grid - 1) / grid) * total;
    let acc = 0;
    let idx = 0;
    for (let i = 0; i < w.length; i++) {
      acc += w[i];
      if (r < acc) {
        idx = i;
        break;
      }
    }
    chosen.push(candidates[idx]);
    candidates.splice(idx, 1);
    w.splice(idx, 1);
  }
  return chosen.sort((a, b) => a - b);
}

/* ----------------------- Balance heuristics ----------------------- */

/**
 * Kozmetik denge kontrolleri. Bunlar olasılığı DEĞİŞTİRMEZ; sadece "düzgün
 * yayılmış" görünen kombinasyonları tercih eder. Çok sıkı olmamak için makul
 * bantlar kullanılır ve `maxAttempts` sonunda her hâlükârda bir sonuç döner.
 */
function isBalanced(numbers: number[], min: number, max: number): boolean {
  if (numbers.length < 3) return true; // küçük havuzlarda denge zorlamayız

  const odd = numbers.filter((n) => n % 2 === 1).length;
  const even = numbers.length - odd;
  // Tek/çift en fazla 70/30'a kadar sapabilsin
  const ratioOk = Math.min(odd, even) >= Math.floor(numbers.length * 0.25);

  // Aralık yayılımı: tüm sayılar tek bir yarıda toplanmasın
  const mid = (min + max) / 2;
  const low = numbers.filter((n) => n <= mid).length;
  const high = numbers.length - low;
  const spreadOk = Math.min(low, high) >= Math.floor(numbers.length * 0.2);

  // Ardışıklık: çok uzun ardışık zincir olmasın (>3)
  let run = 1;
  let maxRun = 1;
  const sorted = [...numbers].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 1;
    }
  }
  const consecutiveOk = maxRun <= 3;

  return ratioOk && spreadOk && consecutiveOk;
}

/* --------------------------- Public API --------------------------- */

let _counter = 0;
function uid(): string {
  _counter += 1;
  return `${Date.now().toString(36)}-${_counter}-${secureRandomInt(0, 1e6)}`;
}

export interface GenerateOptions {
  mode?: GenMode;
  /** Hızlı On: kullanıcının seçtiği sayı adedi (1-10) */
  variableCount?: number;
  /**
   * weighted modu için frekans haritası (havuz id -> (sayı -> ağırlık)).
   * UI tarafından opsiyonel sağlanır; verilmezse weighted ~ random olur.
   */
  weights?: Partial<Record<Pool["id"], Map<number, number>>>;
}

/** Tek bir kolon (kupon satırı) üretir. */
export function generateCoupon(
  game: GameDef,
  opts: GenerateOptions = {}
): Coupon {
  const mode: GenMode = opts.mode ?? "random";

  // ŞansFormülü: tüm kupon bileşik skorla üretilir (yalnızca arşivli oyunlar).
  if (mode === "formula" && hasFormula(game.id)) {
    return formulaCoupon(game, opts);
  }
  const pools: GeneratedPool[] = game.pools.map((pool, idx) => {
    let count = pool.count;
    if (game.variableCount && game.variableCount.poolIndex === idx) {
      const vc = opts.variableCount ?? game.variableCount.default;
      count = Math.max(game.variableCount.min, Math.min(game.variableCount.max, vc));
    }

    let numbers: number[];
    if (mode === "lowshare") {
      // Kalabalıktan uzak kombinasyon: aday çekilişler içinden en az popüler
      // olanı seç. Olasılığı DEĞİŞTİRMEZ; beklenen paylaşımı azaltır.
      numbers = selectLowShare(pool.min, pool.max, count, (a, b, c) =>
        pickUnique(a, b, c)
      );
    } else {
      numbers = pickUnique(pool.min, pool.max, count);
      if (mode === "balanced") {
        const maxAttempts = 40;
        let attempts = 0;
        while (!isBalanced(numbers, pool.min, pool.max) && attempts < maxAttempts) {
          numbers = pickUnique(pool.min, pool.max, count);
          attempts++;
        }
      }
    }

    return {
      id: pool.id,
      labelKey: pool.labelKey,
      numbers,
      min: pool.min,
      max: pool.max,
    };
  });

  return { uid: uid(), gameId: game.id, pools, mode, createdAt: Date.now() };
}

function formulaCoupon(game: GameDef, opts: GenerateOptions, prebuilt?: { numbers: number[]; score: number }): Coupon {
  const mainPool = game.pools[0];
  let count = mainPool.count;
  if (game.variableCount && game.variableCount.poolIndex === 0) {
    const vc = opts.variableCount ?? game.variableCount.default;
    count = Math.max(game.variableCount.min, Math.min(game.variableCount.max, vc));
  }
  const fc =
    prebuilt ??
    formulaGenerate(game.id, mainPool.min, mainPool.max, count, 1, secureRandomInt, (a, b, c) =>
      pickUnique(a, b, c)
    )![0];
  const pools: GeneratedPool[] = [
    { id: mainPool.id, labelKey: mainPool.labelKey, numbers: fc.numbers, min: mainPool.min, max: mainPool.max },
  ];
  const extraPool = game.pools[1];
  if (extraPool) {
    const ev =
      formulaExtra(game.id, secureRandomInt) ??
      pickUnique(extraPool.min, extraPool.max, extraPool.count)[0];
    pools.push({ id: extraPool.id, labelKey: extraPool.labelKey, numbers: [ev], min: extraPool.min, max: extraPool.max });
  }
  return { uid: uid(), gameId: game.id, pools, mode: "formula", createdAt: Date.now(), score: fc.score };
}

/** Birden çok kolon üretir (örn. 10 satır). Formülde çeşitlilik kısıtı uygulanır. */
export function generateCoupons(
  game: GameDef,
  rows: number,
  opts: GenerateOptions = {}
): Coupon[] {
  const mode: GenMode = opts.mode ?? "random";
  if (mode === "formula" && hasFormula(game.id)) {
    const mainPool = game.pools[0];
    let count = mainPool.count;
    if (game.variableCount && game.variableCount.poolIndex === 0) {
      const vc = opts.variableCount ?? game.variableCount.default;
      count = Math.max(game.variableCount.min, Math.min(game.variableCount.max, vc));
    }
    const picked = formulaGenerate(
      game.id, mainPool.min, mainPool.max, count, rows,
      secureRandomInt, (a, b, c) => pickUnique(a, b, c)
    )!;
    return picked.map((fc) => formulaCoupon(game, opts, fc));
  }
  const out: Coupon[] = [];
  for (let i = 0; i < rows; i++) out.push(generateCoupon(game, opts));
  return out;
}

/** Bir kuponu paylaşılabilir/kopyalanabilir metne çevirir. */
export function couponToText(coupon: Coupon): string {
  return coupon.pools
    .map((p) => p.numbers.map((n) => String(n).padStart(2, "0")).join(" - "))
    .join("  |  ");
}

/** Public tekdüze çekiliş (istatistik simülasyonu vb. için). */
export function drawUniform(min: number, max: number, count: number): number[] {
  return pickUnique(min, max, count);
}
