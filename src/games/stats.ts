/**
 * İstatistik / Statistics
 * ────────────────────────────────────────────────────────────────────────
 * Geçmiş çekiliş verisinden sayı frekanslarını hesaplar ve dağılımın ADİL
 * (tekdüzeye yakın) olup olmadığını okur. ÖNEMLİ: Bu veri GELECEĞİ TAHMİN
 * ETMEZ. Adil bir piyangoda "sık gelen" sayının tekrar gelme olasılığı
 * diğerleriyle aynıdır. Panelin amacı şeffaflık ve eğlencedir.
 * ────────────────────────────────────────────────────────────────────────
 */

export interface Draw {
  /** ana havuz sayıları */
  main: number[];
  /** varsa ek havuz (Joker / Şans Topu) */
  extra?: number[];
}

export interface FreqBucket {
  n: number;
  count: number;
  pct: number; // yüzde
}

export interface FreqResult {
  buckets: FreqBucket[];
  totalDraws: number;
  expectedPct: number; // tekdüze beklenen yüzde
  hot: number[]; // en sık (üst 5)
  cold: number[]; // en seyrek (alt 5)
  /** normalize edilmiş sapma (0'a yakın = adil). ~ maxAbsZScore */
  maxDeviation: number;
  verdict: "fair" | "insufficient";
}

/** Ana havuz frekanslarını hesapla. */
export function computeFrequencies(
  draws: Draw[],
  min: number,
  max: number,
  countPerDraw: number
): FreqResult {
  const size = max - min + 1;
  const counts = new Map<number, number>();
  for (let n = min; n <= max; n++) counts.set(n, 0);

  let totalNumbers = 0;
  for (const d of draws) {
    for (const n of d.main) {
      if (n >= min && n <= max) {
        counts.set(n, (counts.get(n) ?? 0) + 1);
        totalNumbers++;
      }
    }
  }

  const totalDraws = draws.length;
  const expectedPerNumber = totalDraws > 0 ? (countPerDraw * totalDraws) / size : 0;
  const expectedPct = size > 0 ? 100 / size : 0;

  const buckets: FreqBucket[] = [];
  for (let n = min; n <= max; n++) {
    const c = counts.get(n) ?? 0;
    buckets.push({ n, count: c, pct: totalNumbers > 0 ? (c / totalNumbers) * 100 : 0 });
  }

  // Binom yaklaşık std sapması; z-skor ile en büyük sapmayı ölç.
  const pEach = countPerDraw / size;
  const sd = Math.sqrt(totalDraws * pEach * (1 - pEach)) || 1;
  let maxDeviation = 0;
  for (const b of buckets) {
    const z = Math.abs(b.count - expectedPerNumber) / sd;
    if (z > maxDeviation) maxDeviation = z;
  }

  const sortedByCount = [...buckets].sort((a, b) => b.count - a.count);
  const hot = sortedByCount.slice(0, 5).map((b) => b.n);
  const cold = sortedByCount.slice(-5).map((b) => b.n).reverse();

  const verdict: FreqResult["verdict"] = totalDraws >= 200 ? "fair" : "insufficient";

  return { buckets, totalDraws, expectedPct, hot, cold, maxDeviation, verdict };
}

/**
 * Demo / boş durum için adil çekilişleri yerel olarak simüle eder.
 * (Gerçek uygulamada bunun yerine resmi geçmiş veri seti yüklenir.)
 */
export function simulateFairDraws(
  count: number,
  min: number,
  max: number,
  countPerDraw: number,
  rnd: (min: number, max: number, n: number) => number[]
): Draw[] {
  const draws: Draw[] = [];
  for (let i = 0; i < count; i++) draws.push({ main: rnd(min, max, countPerDraw) });
  return draws;
}
