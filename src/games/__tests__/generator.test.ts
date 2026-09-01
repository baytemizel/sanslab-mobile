/**
 * Üretim motoru testleri.
 *
 * Bu testler ÜRÜNÜN EN KRİTİK invariant'larını korur: üretilen her kupon,
 * oyunun resmi kurallarına (havuz aralığı, adet, tekrarsızlık) uymak
 * ZORUNDADIR. Bir regresyon burada yakalanmazsa kullanıcı geçersiz bir kupon
 * doldurur.
 */
import { GAMES, getGame, type GameDef } from "../config";
import {
  couponToText,
  drawUniform,
  generateCoupon,
  generateCoupons,
  type Coupon,
  type GenMode,
} from "../generator";
import { hasFormula } from "../fstats";

const REPEATS = 40;
/** ŞansFormülü her çağrıda binlerce aday skorlar — daha az tekrar yeter. */
const FORMULA_REPEATS = 5;

function expectedCount(game: GameDef, poolIndex: number, variableCount?: number) {
  const pool = game.pools[poolIndex];
  if (game.variableCount && game.variableCount.poolIndex === poolIndex) {
    const vc = variableCount ?? game.variableCount.default;
    return Math.max(
      game.variableCount.min,
      Math.min(game.variableCount.max, vc)
    );
  }
  return pool.count;
}

function assertValidCoupon(game: GameDef, coupon: Coupon, variableCount?: number) {
  expect(coupon.gameId).toBe(game.id);
  expect(coupon.uid).toEqual(expect.any(String));
  expect(coupon.pools).toHaveLength(game.pools.length);

  coupon.pools.forEach((generated, i) => {
    const pool = game.pools[i];
    expect(generated.id).toBe(pool.id);
    expect(generated.min).toBe(pool.min);
    expect(generated.max).toBe(pool.max);

    // adet
    expect(generated.numbers).toHaveLength(expectedCount(game, i, variableCount));

    // aralık
    for (const n of generated.numbers) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(pool.min);
      expect(n).toBeLessThanOrEqual(pool.max);
    }

    // tekrarsızlık
    expect(new Set(generated.numbers).size).toBe(generated.numbers.length);

    // artan sıra (UI sıralı gösteriyor)
    const sorted = [...generated.numbers].sort((a, b) => a - b);
    expect(generated.numbers).toEqual(sorted);
  });
}

describe("oyun tanımları", () => {
  it.each(GAMES.map((g) => [g.id, g] as const))(
    "%s: her havuz için istenen adet havuz boyutunu aşmaz",
    (_id, game) => {
      game.pools.forEach((pool, i) => {
        const size = pool.max - pool.min + 1;
        const maxWanted =
          game.variableCount && game.variableCount.poolIndex === i
            ? game.variableCount.max
            : pool.count;
        expect(maxWanted).toBeLessThanOrEqual(size);
        expect(pool.min).toBeLessThan(pool.max);
        expect(pool.count).toBeGreaterThan(0);
      });
    }
  );

  it("getGame bilinen id'yi bulur, bilinmeyende undefined döner", () => {
    expect(getGame("sayisal")?.id).toBe("sayisal");
    expect(getGame("yok-boyle-bir-oyun")).toBeUndefined();
  });

  it("oyun id'leri benzersizdir", () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length);
  });
});

describe("generateCoupon — tüm oyunlar × tüm modlar", () => {
  const modes: GenMode[] = ["random", "balanced", "lowshare", "formula"];

  for (const game of GAMES) {
    for (const mode of modes) {
      const repeats = mode === "formula" ? FORMULA_REPEATS : REPEATS;
      it(`${game.id} / ${mode}: geçerli kupon üretir`, () => {
        for (let i = 0; i < repeats; i++) {
          const coupon = generateCoupon(game, { mode });
          assertValidCoupon(game, coupon);
          expect(coupon.mode).toBe(mode);
        }
      });
    }
  }

  it("ŞansFormülü yalnızca arşivli oyunlarda skor üretir", () => {
    for (const game of GAMES) {
      const coupon = generateCoupon(game, { mode: "formula" });
      if (hasFormula(game.id)) {
        expect(typeof coupon.score).toBe("number");
        expect(Number.isFinite(coupon.score)).toBe(true);
      } else {
        // Arşivi olmayan oyunda formula moda düşmez; skor da olmaz.
        expect(coupon.score).toBeUndefined();
      }
    }
  });
});

describe("Hızlı On — değişken adet", () => {
  const hizli = getGame("hizli")!;

  it.each([1, 2, 5, 9, 10])("kullanıcı %i sayı seçtiğinde o kadar üretir", (n) => {
    const coupon = generateCoupon(hizli, { variableCount: n });
    assertValidCoupon(hizli, coupon, n);
    expect(coupon.pools[0].numbers).toHaveLength(n);
  });

  it("aralık dışı adetleri min/max'a kırpar", () => {
    expect(generateCoupon(hizli, { variableCount: 0 }).pools[0].numbers).toHaveLength(
      hizli.variableCount!.min
    );
    expect(generateCoupon(hizli, { variableCount: 99 }).pools[0].numbers).toHaveLength(
      hizli.variableCount!.max
    );
  });
});

describe("generateCoupons — çoklu satır", () => {
  it.each(GAMES.map((g) => [g.id, g] as const))(
    "%s: 10 satır ister, 10 geçerli satır alır",
    (_id, game) => {
      const rows = generateCoupons(game, 10, { mode: "random" });
      expect(rows).toHaveLength(10);
      rows.forEach((r) => assertValidCoupon(game, r));
      // uid'ler benzersiz olmalı (React key çakışması olmasın)
      expect(new Set(rows.map((r) => r.uid)).size).toBe(10);
    }
  );

  it("formula modunda da istenen satır sayısını döner", () => {
    const game = getGame("sayisal")!;
    const rows = generateCoupons(game, 10, { mode: "formula" });
    expect(rows).toHaveLength(10);
    rows.forEach((r) => assertValidCoupon(game, r));
  });

  it("0 satır istendiğinde boş dizi döner", () => {
    expect(generateCoupons(getGame("super")!, 0)).toEqual([]);
  });
});

describe("drawUniform", () => {
  it("istenen adette, aralıkta, tekrarsız sayı verir", () => {
    for (let i = 0; i < 200; i++) {
      const nums = drawUniform(1, 49, 6);
      expect(nums).toHaveLength(6);
      expect(new Set(nums).size).toBe(6);
      expect(Math.min(...nums)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...nums)).toBeLessThanOrEqual(49);
    }
  });

  it("havuzun tamamı istendiğinde tüm sayıları döner", () => {
    expect(drawUniform(1, 5, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("havuzdan fazla sayı istenirse hata verir", () => {
    expect(() => drawUniform(1, 5, 6)).toThrow();
  });

  it("dağılım kabaca tekdüzedir (modulo sapması yok)", () => {
    // 1..10 havuzundan 1 sayı, 4000 kez. Beklenen ~400, tolerans geniş.
    const counts = new Array(11).fill(0);
    for (let i = 0; i < 4000; i++) counts[drawUniform(1, 10, 1)[0]] += 1;
    for (let n = 1; n <= 10; n++) {
      expect(counts[n]).toBeGreaterThan(250);
      expect(counts[n]).toBeLessThan(600);
    }
  });
});

describe("couponToText", () => {
  it("havuzları ayırır ve sayıları iki haneye tamamlar", () => {
    const coupon: Coupon = {
      uid: "x",
      gameId: "sayisal",
      mode: "random",
      createdAt: 0,
      pools: [
        { id: "main", labelKey: "pool.main", numbers: [3, 17, 42], min: 1, max: 90 },
        { id: "joker", labelKey: "pool.joker", numbers: [9], min: 1, max: 90 },
      ],
    };
    expect(couponToText(coupon)).toBe("03 - 17 - 42  |  09");
  });
});
