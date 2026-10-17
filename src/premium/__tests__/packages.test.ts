import { LIST_PRICES_USD, formatUsd, savingsPercent } from "../packages";

describe("liste fiyatları", () => {
  const priced = [
    { packageType: "MONTHLY", price: LIST_PRICES_USD.MONTHLY },
    { packageType: "ANNUAL", price: LIST_PRICES_USD.ANNUAL },
  ];

  it("yıllık plan aylığa göre %17 tasarruf sağlar", () => {
    expect(savingsPercent(priced[1], priced)).toBe(17);
    expect(savingsPercent(priced[0], priced)).toBeNull();
  });

  it("USD tutarını dile göre biçimlendirir", () => {
    expect(formatUsd(0.49, "en")).toBe("$0.49");
    expect(formatUsd(4.9 / 12, "en")).toBe("$0.41");
  });
});
