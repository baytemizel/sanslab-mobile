/**
 * RevenueCat entegrasyonu / RevenueCat integration
 *
 * Entitlement: "premium"
 * Offering   : "default" (aylık / yıllık / lifetime paketleri)
 *
 * Anahtarlar `app.json -> extra.revenuecat` ya da ortam değişkenlerinden gelir
 * (bkz. app.config.ts). Anahtar hâlâ placeholder ise SDK BAŞLATILMAZ; tüm
 * fonksiyonlar güvenli varsayılan döner ve uygulama free katmanda çalışır.
 */

import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import { Platform } from "react-native";

import { revenueCatKeys } from "./env";

export const PREMIUM_ENTITLEMENT = "premium";

let _configured = false;

/** Mağaza entegrasyonu bu derlemede gerçekten kullanılabilir mi? */
export function isPurchasesAvailable(): boolean {
  return _configured;
}

function apiKey(): string | undefined {
  return Platform.OS === "ios" ? revenueCatKeys.ios : revenueCatKeys.android;
}

export async function initPurchases(): Promise<void> {
  if (_configured) return;

  const key = apiKey();
  if (!key) {
    if (__DEV__) {
      console.warn(
        "[revenuecat] API anahtarı yapılandırılmadı — satın alma devre dışı, uygulama free katmanda çalışıyor."
      );
    }
    return;
  }

  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey: key });
    _configured = true;
  } catch (e) {
    if (__DEV__) console.warn("[revenuecat] init failed:", e);
  }
}

export function hasPremium(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!_configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  if (!_configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export interface PurchaseResult {
  info: CustomerInfo | null;
  /** Kullanıcı iptal ettiyse hata gösterme. */
  cancelled: boolean;
  error?: string;
}

export async function purchase(
  pkg: PurchasesPackage
): Promise<PurchaseResult> {
  if (!_configured) return { info: null, cancelled: false, error: "unavailable" };
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { info: customerInfo, cancelled: false };
  } catch (e: any) {
    if (e?.userCancelled) return { info: null, cancelled: true };
    if (__DEV__) console.warn("[revenuecat] purchase error", e);
    return { info: null, cancelled: false, error: String(e?.message ?? e) };
  }
}

export async function restore(): Promise<CustomerInfo | null> {
  if (!_configured) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

/**
 * Kullanıcı giriş yaptığında çağrılır: satın alma, cihazlar arasında bu
 * kimlikle taşınır. (Faz 2 — auth)
 */
export async function linkUser(uid: string): Promise<CustomerInfo | null> {
  if (!_configured) return null;
  try {
    const { customerInfo } = await Purchases.logIn(uid);
    return customerInfo;
  } catch (e) {
    if (__DEV__) console.warn("[revenuecat] logIn failed:", e);
    return null;
  }
}

/**
 * Çıkışta anonim kimliğe döner. Zaten anonimken `logOut` hata fırlattığı için
 * önce kontrol edilir.
 */
export async function unlinkUser(): Promise<CustomerInfo | null> {
  if (!_configured) return null;
  try {
    if (await Purchases.isAnonymous()) return null;
    return await Purchases.logOut();
  } catch (e) {
    if (__DEV__) console.warn("[revenuecat] logOut failed:", e);
    return null;
  }
}

export function addCustomerInfoListener(
  cb: (info: CustomerInfo) => void
): () => void {
  if (!_configured) return () => {};
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}
