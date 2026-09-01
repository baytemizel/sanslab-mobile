import { computeFrequencies, simulateFairDraws, type Draw } from "../stats";
import { drawUniform } from "../generator";
import { couponPopularityScore, numberPopularity, selectLowShare } from "../popularity";

describe("computeFrequencies", () => {
  const draws: Draw[] = simulateFairDraws(500, 1, 49, 6, drawUniform);
  const result = computeFrequencies(draws, 1, 49, 6);

  it("havuzdaki her sayı için bir kova üretir", () => {
    expect(result.buckets).toHaveLength(49);
    expect(result.buckets[0].n).toBe(1);
    expect(result.buckets[48].n).toBe(49);
  });

  it("toplam sayaç = çekiliş sayısı × çekiliş başına sayı", () => {
    const total = result.buckets.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(500 * 6);
    expect(result.totalDraws).toBe(500);
  });

  it("sıcak/soğuk listeleri havuzdan gelir ve kesişmez", () => {
    expect(result.hot.length).toBeGreaterThan(0);
    expect(result.cold.length).toBeGreaterThan(0);
    const overlap = result.hot.filter((n) => result.cold.includes(n));
    expect(overlap).toHaveLength(0);
    [...result.hot, ...result.cold].forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(49);
    });
  });

  it("adil simülasyonda kararı 'fair' olur", () => {
    expect(result.verdict).toBe("fair");
  });

  it("çok az veride 'insufficient' der", () => {
    const few = computeFrequencies(simulateFairDraws(3, 1, 49, 6, drawUniform), 1, 49, 6);
    expect(few.verdict).toBe("insufficient");
  });

  it("hiç çekiliş yokken çökmez", () => {
    const empty = computeFrequencies([], 1, 10, 5);
    expect(empty.totalDraws).toBe(0);
    expect(empty.buckets).toHaveLength(10);
    expect(empty.buckets.every((b) => b.count === 0)).toBe(true);
  });
});

describe("popülerlik / az paylaşılan", () => {
  it("düşük sayılar (doğum günü aralığı) daha popüler sayılır", () => {
    expect(numberPopularity(7, 90)).toBeGreaterThan(numberPopularity(77, 90));
    expect(numberPopularity(12, 90)).toBeGreaterThan(numberPopularity(58, 90));
  });

  it("popülerlik skoru pozitiftir", () => {
    expect(couponPopularityScore([1, 2, 3, 4, 5, 6], 1, 90)).toBeGreaterThan(0);
  });

  it("selectLowShare, düz rastgeleden daha düşük popülerlik skoru üretir", () => {
    const pick = (min: number, max: number, count: number) =>
      drawUniform(min, max, count);

    let lowShareTotal = 0;
    let randomTotal = 0;
    const N = 30;
    for (let i = 0; i < N; i++) {
      lowShareTotal += couponPopularityScore(selectLowShare(1, 90, 6, pick), 1, 90);
      randomTotal += couponPopularityScore(pick(1, 90, 6), 1, 90);
    }
    expect(lowShareTotal / N).toBeLessThan(randomTotal / N);
  });

  it("selectLowShare geçerli bir kupon döner", () => {
    const nums = selectLowShare(1, 34, 5, drawUniform);
    expect(nums).toHaveLength(5);
    expect(new Set(nums).size).toBe(5);
    nums.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(34);
    });
  });
});
