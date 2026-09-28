/**
 * Kupon geçmişi & favoriler / Coupon history & favourites  (FAZ 3)
 *
 * Paywall'da vaat edilen "sınırsız geçmiş + favoriler" faydasının gerçek
 * karşılığıdır. Veriler CİHAZDA (AsyncStorage) tutulur ve hesap gerektirmez;
 * giriş yapılmışsa ayrıca Firestore'a yedeklenir (src/services/cloudSync.ts).
 *
 * Free katman: son `FREE_HISTORY_LIMIT` kupon + `FREE_FAVORITE_LIMIT` favori.
 * Premium: `PREMIUM_HISTORY_LIMIT` kupon, sınırsıza yakın favori.
 * Favoriler budamada ASLA silinmez.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Coupon } from "../games/generator";
import { historyLimit, type GateContext } from "../premium/gates";

export const HISTORY_KEY = "@sanslab/history-v1";

export interface SavedCoupon extends Coupon {
  favorite: boolean;
  /** Kullanıcının verdiği isteğe bağlı etiket. */
  note?: string;
}

/* --------------------------- Saf yardımcılar --------------------------- */
/* Bu fonksiyonlar I/O yapmaz; doğrudan birim testi yazılabilir. */

/** Yeni kuponları listenin başına ekler (budamadan). */
export function prependToHistory(
  list: SavedCoupon[],
  coupons: Coupon[]
): SavedCoupon[] {
  const incoming: SavedCoupon[] = coupons.map((c) => ({ ...c, favorite: false }));
  return [...incoming, ...list];
}

/** Yeni kuponları listenin başına ekler ve limite göre budar. */
export function addToHistory(
  list: SavedCoupon[],
  coupons: Coupon[],
  ctx: GateContext
): SavedCoupon[] {
  return pruneHistory(prependToHistory(list, coupons), ctx);
}

/** Favoriler korunarak listeyi limite indirir. */
export function pruneHistory(
  list: SavedCoupon[],
  ctx: GateContext
): SavedCoupon[] {
  const limit = historyLimit(ctx);
  const favorites = list.filter((c) => c.favorite);
  const rest = list.filter((c) => !c.favorite);
  const keptRest = rest.slice(0, Math.max(0, limit - favorites.length));

  // Orijinal sırayı (yeniden eskiye) koru.
  const keep = new Set([...favorites, ...keptRest].map((c) => c.uid));
  return list.filter((c) => keep.has(c.uid));
}

export function toggleFavorite(
  list: SavedCoupon[],
  uid: string
): SavedCoupon[] {
  return list.map((c) => (c.uid === uid ? { ...c, favorite: !c.favorite } : c));
}

export function removeFromHistory(
  list: SavedCoupon[],
  uid: string
): SavedCoupon[] {
  return list.filter((c) => c.uid !== uid);
}

export function countFavorites(list: SavedCoupon[]): number {
  return list.reduce((n, c) => n + (c.favorite ? 1 : 0), 0);
}

export function filterHistory(
  list: SavedCoupon[],
  opts: { gameId?: string; favoritesOnly?: boolean }
): SavedCoupon[] {
  return list.filter((c) => {
    if (opts.gameId && c.gameId !== opts.gameId) return false;
    if (opts.favoritesOnly && !c.favorite) return false;
    return true;
  });
}

/* ------------------------------ Kalıcılık ------------------------------ */

/**
 * Bozuk/eski kayıtları ayıklar — sürüm yükseltmelerinde çökmeyi önler. Buluttan
 * (Firestore) gelen kayıtlar da aynı süzgeçten geçer.
 */
export function sanitizeHistory(raw: unknown): SavedCoupon[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c: any) =>
      c &&
      typeof c.uid === "string" &&
      typeof c.gameId === "string" &&
      Array.isArray(c.pools)
  ) as SavedCoupon[];
}

export async function loadHistory(): Promise<SavedCoupon[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return sanitizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveHistory(list: SavedCoupon[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* depolama dolu / erişilemez — sessizce geç */
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {
    /* no-op */
  }
}
