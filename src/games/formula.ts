/**
 * ŞansFormülü motoru / composite-score engine
 * ────────────────────────────────────────────────────────────────────────
 * Arşiv analizli bileşik skor: kombinasyonları 7 bileşenle puanlar ve en
 * yüksek skorluyu seçer. DÜRÜSTLÜK: geçmiş istatistikler geleceği tahmin
 * etmez; bu mod kazanma OLASILIĞINI DEĞİŞTİRMEZ. F/R/G/P bileşenleri
 * tarihsel eğilimleri, S/B yapısal tipikliği, A ise kalabalık şablonlardan
 * kaçınmayı (kazançta paylaşım azaltıcı) temsil eder.
 *
 *   SKOR = 0.15·F + 0.10·R + 0.10·G + 0.10·P + 0.15·S + 0.10·B + 0.30·A
 * ────────────────────────────────────────────────────────────────────────
 */
import { FSTATS, GameStats } from "./fstats";

const W = { F: 0.15, R: 0.1, G: 0.1, P: 0.1, S: 0.15, B: 0.1, A: 0.3 };
const LUCKY = new Set([1, 3, 7, 9, 11, 13, 17, 21, 23, 33]);

export interface FormulaCoupon {
  numbers: number[];
  score: number;
}

/** Kalabalık ŞABLON cezası (sayı kimliği değil; v2). */
function patternPenalty(nums: number[], nmax: number): number {
  const so = [...nums].sort((a, b) => a - b);
  const k = so.length;
  let s = 0;
  if (nmax > 40) {
    const bd = nums.filter((n) => n <= 31).length;
    const allowed = Math.floor(k / 2);
    if (bd > allowed) s += (bd - allowed) * 1.2;
  }
  let run = 1,
    mx = 1;
  for (let i = 1; i < k; i++) {
    run = so[i] === so[i - 1] + 1 ? run + 1 : 1;
    mx = Math.max(mx, run);
  }
  if (mx >= 2) s += (mx - 1) * 0.8;
  if (k >= 3) {
    const d = so[1] - so[0];
    if (d > 0 && so.every((v, i) => i === 0 || v - so[i - 1] === d)) s += 2.5;
  }
  const dec = new Set(so.map((n) => Math.floor((n - 1) / 10)));
  if (k >= 5 && dec.size <= 2) s += 1.2;
  if (nmax > 40 && so[k - 1] - so[0] < (nmax - 1) * 0.45) s += 1.0;
  const lc = nums.filter((n) => LUCKY.has(n)).length;
  if (lc >= 3) s += (lc - 2) * 0.6;
  if (nums.filter((n) => n % 10 === 7).length >= 3) s += 0.5;
  return s;
}

function scoreCombo(nums: number[], st: GameStats, nmax: number): number {
  const k = nums.length;
  const so = [...nums].sort((a, b) => a - b);
  const avg = (f: (n: number) => number) => nums.reduce((a, n) => a + f(n), 0) / k;
  const F = avg((n) => st.z[n] ?? 0);
  const R = avg((n) => st.rz[n] ?? 0);
  const G = avg((n) => st.gap[n] ?? 1) - 1;
  let ps = 0,
    pc = 0;
  for (let i = 0; i < k; i++)
    for (let j = i + 1; j < k; j++) {
      ps += st.lift[`${so[i]}-${so[j]}`] ?? 1;
      pc++;
    }
  const P = ps / pc - 1;
  const sum = nums.reduce((a, b) => a + b, 0);
  const S = Math.exp(-Math.pow((sum - st.mu) / st.sigma, 2) / 2);
  const odd = nums.filter((n) => n % 2 === 1).length;
  const low = nums.filter((n) => n <= st.mid).length;
  const B = (st.oddMode.includes(odd) ? 0.5 : 0) + (st.lowMode.includes(low) ? 0.5 : 0);
  const A = 1 - patternPenalty(nums, nmax) / 3;
  return W.F * F + W.R * R + W.G * G + W.P * P + W.S * S + W.B * B + W.A * A;
}

/** Sıcaklık/form/gecikme ağırlıklı tekrarsız çekiliş. */
function guidedPick(
  min: number,
  max: number,
  count: number,
  st: GameStats,
  rnd: (min: number, max: number) => number
): number[] {
  const nums: number[] = [];
  const w: number[] = [];
  for (let n = min; n <= max; n++) {
    nums.push(n);
    w.push(
      Math.exp(0.9 * (0.6 * (st.z[n] ?? 0) + 0.4 * (st.rz[n] ?? 0)) + 0.5 * ((st.gap[n] ?? 1) - 1))
    );
  }
  const out: number[] = [];
  for (let c = 0; c < count; c++) {
    const tot = w.reduce((a, b) => a + b, 0);
    let r = (rnd(0, 1e9 - 1) / 1e9) * tot;
    let idx = 0;
    for (let i = 0; i < w.length; i++) {
      if (r < w[i]) {
        idx = i;
        break;
      }
      r -= w[i];
    }
    out.push(nums[idx]);
    nums.splice(idx, 1);
    w.splice(idx, 1);
  }
  return out.sort((a, b) => a - b);
}

/**
 * Ana havuz için formül kuponları üretir.
 * rows>1'de kuponlar arası en fazla (count-4) ortak sayı (çeşitlilik).
 */
export function formulaGenerate(
  gameId: string,
  min: number,
  max: number,
  count: number,
  rows: number,
  rnd: (min: number, max: number) => number,
  uniformPick: (min: number, max: number, count: number) => number[]
): FormulaCoupon[] | null {
  const st = FSTATS[gameId];
  if (!st) return null;
  const CAND = rows > 1 ? 6000 : 3500;
  const seen = new Set<string>();
  const scored: Array<[number, number[]]> = [];
  for (let i = 0; i < CAND; i++) {
    const c =
      i % 10 < 7 ? guidedPick(min, max, count, st, rnd) : uniformPick(min, max, count);
    const key = c.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    scored.push([scoreCombo(c, st, max), c]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const maxOv = Math.max(1, count - 4);
  const picked: FormulaCoupon[] = [];
  for (const [t, c] of scored) {
    if (picked.every((p) => c.filter((n) => p.numbers.includes(n)).length <= maxOv)) {
      picked.push({ numbers: c, score: t });
    }
    if (picked.length === rows) break;
  }
  return picked;
}

/** Ek top (Joker / Şans Topu): skor-ağırlıklı softmax örnekleme (T=0.45). */
export function formulaExtra(
  gameId: string,
  rnd: (min: number, max: number) => number
): number | null {
  const st = FSTATS[gameId];
  if (!st?.extraScore) return null;
  const es = Object.entries(st.extraScore);
  const w = es.map(([, v]) => Math.exp(v / 0.45));
  const tot = w.reduce((a, b) => a + b, 0);
  let r = (rnd(0, 1e9 - 1) / 1e9) * tot;
  for (let i = 0; i < w.length; i++) {
    if (r < w[i]) return +es[i][0];
    r -= w[i];
  }
  return +es[es.length - 1][0];
}
