/**
 * Paket sunumu yardımcıları / Package presentation helpers
 *
 * Fiyatlar HİÇBİR ZAMAN kod içinde sabitlenmez — mağazadan (RevenueCat) gelir.
 * Burada yalnızca etiketleme ve tasarruf yüzdesi hesabı yapılır.
 */

/** RevenueCat `packageType` → i18n anahtarı. */
export function periodKey(packageType: string): string {
  switch (packageType) {
    case "WEEKLY":
      return "premium.weekly";
    case "MONTHLY":
      return "premium.monthly";
    case "TWO_MONTH":
      return "premium.twoMonth";
    case "THREE_MONTH":
      return "premium.threeMonth";
    case "SIX_MONTH":
      return "premium.sixMonth";
    case "ANNUAL":
      return "premium.yearly";
    case "LIFETIME":
      return "premium.lifetime";
    default:
      return "premium.plan";
  }
}

/** Bir paketin kaç aya karşılık geldiği (tasarruf hesabı için). */
export function monthsFor(packageType: string): number | null {
  switch (packageType) {
    case "WEEKLY":
      return 0.25;
    case "MONTHLY":
      return 1;
    case "TWO_MONTH":
      return 2;
    case "THREE_MONTH":
      return 3;
    case "SIX_MONTH":
      return 6;
    case "ANNUAL":
      return 12;
    default:
      return null; // LIFETIME / CUSTOM için aylık kıyas anlamsız
  }
}

export interface PricedPackage {
  packageType: string;
  price: number;
}

/**
 * Aylık plana kıyasla tasarruf yüzdesi (tam sayı). Kıyas yapılamıyorsa `null`.
 * Örn. aylık 49,99 ve yıllık 399,99 → %33.
 */
export function savingsPercent(
  pkg: PricedPackage,
  all: PricedPackage[]
): number | null {
  const months = monthsFor(pkg.packageType);
  if (!months || months <= 1) return null;

  const monthly = all.find((p) => p.packageType === "MONTHLY");
  if (!monthly || monthly.price <= 0) return null;

  const baseline = monthly.price * months;
  if (baseline <= 0) return null;

  const saved = Math.round((1 - pkg.price / baseline) * 100);
  return saved >= 5 ? saved : null;
}

/** Varsayılan seçim: yıllık > en uzun süreli > ilk paket. */
export function defaultSelection<T extends { packageType: string }>(
  packages: T[]
): T | null {
  if (packages.length === 0) return null;
  const annual = packages.find((p) => p.packageType === "ANNUAL");
  if (annual) return annual;

  const withMonths = packages
    .map((p) => ({ p, m: monthsFor(p.packageType) ?? 0 }))
    .sort((a, b) => b.m - a.m);
  return withMonths[0]?.p ?? packages[0];
}
