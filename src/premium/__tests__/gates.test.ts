import {
  canExportHistory,
  canFavorite,
  canUseMode,
  canUseRows,
  favoriteLimit,
  FREE_FAVORITE_LIMIT,
  FREE_HISTORY_LIMIT,
  FREE_MAX_ROWS,
  historyLimit,
  PREMIUM_BENEFIT_KEYS,
  PREMIUM_HISTORY_LIMIT,
  showsAds,
} from "../gates";
import { defaultSelection, monthsFor, periodKey, savingsPercent } from "../packages";
import tr from "../../i18n/tr";
import en from "../../i18n/en";

const FREE = { isPremium: false };
const PREMIUM = { isPremium: true };

describe("premium kapıları", () => {
  it("rastgele mod herkese açık, diğerleri premium", () => {
    expect(canUseMode("random", FREE)).toBe(true);
    expect(canUseMode("balanced", FREE)).toBe(false);
    expect(canUseMode("lowshare", FREE)).toBe(false);
    expect(canUseMode("formula", FREE)).toBe(false);
  });

  it("premium tüm modları açar", () => {
    (["random", "balanced", "lowshare", "formula"] as const).forEach((m) => {
      expect(canUseMode(m, PREMIUM)).toBe(true);
    });
  });

  it("free katmanda 10 satıra kadar üretim serbesttir", () => {
    expect(canUseRows(1, FREE)).toBe(true);
    expect(canUseRows(FREE_MAX_ROWS, FREE)).toBe(true);
    expect(canUseRows(FREE_MAX_ROWS + 1, FREE)).toBe(false);
    expect(canUseRows(100, PREMIUM)).toBe(true);
  });

  it("geçmiş ve favori limitleri katmana göre değişir", () => {
    expect(historyLimit(FREE)).toBe(FREE_HISTORY_LIMIT);
    expect(historyLimit(PREMIUM)).toBe(PREMIUM_HISTORY_LIMIT);
    expect(favoriteLimit(FREE)).toBe(FREE_FAVORITE_LIMIT);
    expect(historyLimit(PREMIUM)).toBeGreaterThan(historyLimit(FREE));
  });

  it("favori limiti dolunca yeni favori engellenir", () => {
    expect(canFavorite(FREE_FAVORITE_LIMIT - 1, FREE)).toBe(true);
    expect(canFavorite(FREE_FAVORITE_LIMIT, FREE)).toBe(false);
    expect(canFavorite(FREE_FAVORITE_LIMIT, PREMIUM)).toBe(true);
  });

  it("reklamlar ve dışa aktarma katmana bağlıdır", () => {
    expect(showsAds(FREE)).toBe(true);
    expect(showsAds(PREMIUM)).toBe(false);
    expect(canExportHistory(FREE)).toBe(false);
    expect(canExportHistory(PREMIUM)).toBe(true);
  });
});

describe("paywall dürüstlüğü", () => {
  /**
   * Mağaza reddi riski: paywall'da vaat edilen her faydanın çeviri karşılığı
   * OLMALIDIR. Metin yoksa kullanıcıya ham anahtar gösterilir.
   */
  it.each(PREMIUM_BENEFIT_KEYS)("%s her iki dilde de tanımlı", (key) => {
    const path = key.split(".");
    const resolve = (obj: any) => path.reduce((o, k) => o?.[k], obj);
    expect(typeof resolve(tr)).toBe("string");
    expect(typeof resolve(en)).toBe("string");
    expect(String(resolve(tr)).length).toBeGreaterThan(3);
  });
});

describe("paket sunumu", () => {
  it("packageType'ı i18n anahtarına çevirir", () => {
    expect(periodKey("MONTHLY")).toBe("premium.monthly");
    expect(periodKey("ANNUAL")).toBe("premium.yearly");
    expect(periodKey("LIFETIME")).toBe("premium.lifetime");
    expect(periodKey("GARIP_BIR_SEY")).toBe("premium.plan");
  });

  it("ay karşılıklarını bilir", () => {
    expect(monthsFor("MONTHLY")).toBe(1);
    expect(monthsFor("ANNUAL")).toBe(12);
    expect(monthsFor("LIFETIME")).toBeNull();
  });

  it("yıllık planın tasarrufunu aylığa göre hesaplar", () => {
    const all = [
      { packageType: "MONTHLY", price: 50 },
      { packageType: "ANNUAL", price: 400 },
    ];
    // 12 × 50 = 600 → 400 → %33
    expect(savingsPercent(all[1], all)).toBe(33);
  });

  it("aylık plan yoksa ya da tasarruf önemsizse rozet göstermez", () => {
    expect(
      savingsPercent({ packageType: "ANNUAL", price: 400 }, [
        { packageType: "ANNUAL", price: 400 },
      ])
    ).toBeNull();

    const all = [
      { packageType: "MONTHLY", price: 50 },
      { packageType: "ANNUAL", price: 595 }, // sadece %1
    ];
    expect(savingsPercent(all[1], all)).toBeNull();
    expect(savingsPercent(all[0], all)).toBeNull(); // aylığın kendisi
  });

  it("varsayılan olarak yıllık planı seçer", () => {
    const pkgs = [
      { packageType: "MONTHLY" },
      { packageType: "ANNUAL" },
      { packageType: "LIFETIME" },
    ];
    expect(defaultSelection(pkgs)?.packageType).toBe("ANNUAL");
  });

  it("yıllık yoksa en uzun süreliyi seçer, boş listede null döner", () => {
    expect(
      defaultSelection([{ packageType: "MONTHLY" }, { packageType: "SIX_MONTH" }])
        ?.packageType
    ).toBe("SIX_MONTH");
    expect(defaultSelection([])).toBeNull();
  });
});
