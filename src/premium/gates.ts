/**
 * Premium kapı politikası — TEK KAYNAK / Single source of truth for paywall gates
 *
 * Paywall'da vaat edilen her fayda burada karşılığını bulmak ZORUNDADIR.
 * Mağazalar (App Store 3.1.2, Play Payments) uygulamada bulunmayan bir
 * özelliğin satılmasını reddeder. Yeni bir kapı eklerken:
 *   1) buraya bir alan ekle,
 *   2) i18n'de `premium.benefit*` metnini güncelle,
 *   3) ilgili ekranda `canUse...` yardımcısını kullan.
 */

import type { GenMode } from "../games/generator";

/** Free katmanda saklanan kupon geçmişi sınırı. */
export const FREE_HISTORY_LIMIT = 10;
/** Premium katmanda saklanan kupon geçmişi sınırı. */
export const PREMIUM_HISTORY_LIMIT = 500;
/** Free katmanda favorilenebilecek kupon sınırı. */
export const FREE_FAVORITE_LIMIT = 3;

/** Free katmanda tek seferde üretilebilecek en fazla kolon sayısı. */
export const FREE_MAX_ROWS = 10;

/** Rastgele mod herkese açıktır; skorlu/sezgisel modlar premium'dur. */
export const FREE_MODES: GenMode[] = ["random"];

export interface GateContext {
  isPremium: boolean;
}

export function canUseMode(mode: GenMode, ctx: GateContext): boolean {
  return ctx.isPremium || FREE_MODES.includes(mode);
}

export function canUseRows(rows: number, ctx: GateContext): boolean {
  return ctx.isPremium || rows <= FREE_MAX_ROWS;
}

export function historyLimit(ctx: GateContext): number {
  return ctx.isPremium ? PREMIUM_HISTORY_LIMIT : FREE_HISTORY_LIMIT;
}

export function favoriteLimit(ctx: GateContext): number {
  return ctx.isPremium ? PREMIUM_HISTORY_LIMIT : FREE_FAVORITE_LIMIT;
}

export function canFavorite(currentFavorites: number, ctx: GateContext): boolean {
  return currentFavorites < favoriteLimit(ctx);
}

/** Reklamlar yalnızca free katmanda gösterilir. */
export function showsAds(ctx: GateContext): boolean {
  return !ctx.isPremium;
}

/** Geçmişin tamamını metin olarak dışa aktarma. */
export function canExportHistory(ctx: GateContext): boolean {
  return ctx.isPremium;
}

/**
 * Paywall'da listelenen faydaların i18n anahtarları.
 * Her anahtarın bu dosyada gerçek bir karşılığı OLMALIDIR — bkz. dosya başı not.
 */
export const PREMIUM_BENEFIT_KEYS = [
  "premium.benefit1", // reklamsız                → showsAds()
  "premium.benefit2", // tüm üretim modları       → canUseMode()
  "premium.benefit3", // sınırsız geçmiş+favori   → historyLimit() / favoriteLimit()
  "premium.benefit4", // geçmişi dışa aktar       → canExportHistory()
  "premium.benefit5", // erken erişim / destek
] as const;
