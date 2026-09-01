/**
 * Popülerlik modeli / Popularity model
 * ────────────────────────────────────────────────────────────────────────
 * İnsanlar rastgele seçmez: doğum günü (1–31), "şanslı" sayılar (7, 3, 11…),
 * ardışık ve desenli kombinasyonlar aşırı tercih edilir. Bu tercihlerden
 * KAÇINMAK kazanma OLASILIĞINI DEĞİŞTİRMEZ — ama kazanırsan ikramiyeyi daha
 * az kişiyle paylaşman olasıdır (daha yüksek BEKLENEN getiri, aynı şans).
 *
 * Bu modül resmi bilet-satış verisi gerektirmez; iyi bilinen insan seçim
 * eğilimlerini yaklaşık modelleyen bir sezgiseldir. Amacı tahmin değil,
 * "kalabalıktan uzak" bir kombinasyon üretmektir.
 * ────────────────────────────────────────────────────────────────────────
 */

const LUCKY = new Set([1, 3, 7, 9, 11, 13, 17, 21, 23, 33]);

/** Tek bir sayının göreli seçilme eğilimi (>1 = daha popüler). */
export function numberPopularity(n: number, max: number): number {
  let p = 1.0;
  if (n <= 31) p *= 1.6; // takvim günleri (doğum günü)
  if (n <= 12) p *= 1.25; // aynı zamanda aylar
  if (LUCKY.has(n)) p *= 1.4; // "şanslı" sayılar
  if (n === 7) p *= 1.35; // 7 ekstra sevilir
  if (max > 45 && n > 45) p *= 0.82; // yüksek sayılar az seçilir
  if (max > 60 && n > 60) p *= 0.85;
  return p;
}

/**
 * Bir kombinasyonun "popülerlik skoru" (düşük = kalabalıktan uzak = tercih).
 * Sayı-bazlı popülerlik + kombinasyon-bazlı desen cezaları toplamıdır.
 */
export function couponPopularityScore(numbers: number[], min: number, max: number): number {
  let s = numbers.reduce((a, n) => a + numberPopularity(n, max), 0);
  const sorted = [...numbers].sort((a, b) => a - b);

  // Doğum günü yoğunluğu: çok sayıda <=31
  const bday = numbers.filter((n) => n <= 31).length;
  s += bday * 0.45;

  // Ardışık zincirler (desenli seçim)
  let run = 1;
  let maxRun = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      run++;
      maxRun = Math.max(maxRun, run);
    } else run = 1;
  }
  s += (maxRun - 1) * 0.7;

  // Eşit aralıklı dizi (ör. 5-10-15-20…) çok popülerdir
  if (sorted.length >= 3) {
    const d = sorted[1] - sorted[0];
    let arithmetic = d > 0;
    for (let i = 2; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] !== d) {
        arithmetic = false;
        break;
      }
    }
    if (arithmetic) s += 2.0;
  }

  // Aynı onluk dilimde toplanma (ör. hepsi 1-10)
  const decades = new Set(sorted.map((n) => Math.floor((n - 1) / 10)));
  if (sorted.length >= 4 && decades.size <= 2) s += 0.8;

  // Çok fazla "şanslı" sayı
  const luckyCount = numbers.filter((n) => LUCKY.has(n)).length;
  if (luckyCount >= 3) s += (luckyCount - 2) * 0.5;

  return s;
}

/**
 * Aday kombinasyonlar arasından en düşük popülerlik skorlusunu seçer.
 * `pick`, generator'ın kriptografik tekdüze çekilişidir (RNG orada kalır).
 */
export function selectLowShare(
  min: number,
  max: number,
  count: number,
  pick: (min: number, max: number, count: number) => number[],
  candidates = 80
): number[] {
  let best: number[] | null = null;
  let bestScore = Infinity;
  for (let i = 0; i < candidates; i++) {
    const c = pick(min, max, count);
    const score = couponPopularityScore(c, min, max);
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best ?? pick(min, max, count);
}
