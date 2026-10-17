/**
 * RevenueCat entegrasyonu / RevenueCat integration
 *
 * Entitlement: "premium"
 * Offering   : "default" ($rc_monthly / $rc_annual paketleri)
 *
 * Paywall ekranı uygulamanın kendisidir (`app/paywall.tsx`); RevenueCat'in
 * hazır paywall'u kullanılmaz. RevenueCat burada paketleri/fiyatları verir,
 * satın almayı yürütür ve gösterimleri `trackPaywallImpression` ile sayar.
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
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import { Platform } from "react-native";

import { revenueCatKeys } from "./env";

export const PREMIUM_ENTITLEMENT = "premium";

/** RevenueCat panelindeki "custom paywall" gösterimlerinin kimliği. */
export const PAYWALL_ID = "sanslab_paywall";

let _configured = false;

/** Mağaza entegrasyonu bu derlemede gerçekten kullanılabilir mi? */
export function isPurchasesAvailable(): boolean {
  return _configured;
}

/**
 * Bu platform için RevenueCat anahtarı var mı? Yoksa Premium hiçbir zaman
 * açılamaz (kesin "free"); varsa yanıt gelene kadar Premium durumu bilinmez.
 */
export function hasPurchasesKey(): boolean {
  return Boolean(apiKey());
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

/**
 * Kullanıcıya gösterilecek satın alma hatası türü.
 * - `pending`: ödeme onay bekliyor (Play: nakit / yavaş kart); onaylanınca
 *   müşteri dinleyicisi Premium'u kendiliğinden açar.
 * - `alreadyOwned`: abonelik bu mağaza hesabında zaten var → geri yükleme.
 * - `network`, `notAllowed`, `unavailable`: ayrı mesajlar.
 */
export type PurchaseErrorKind =
  | "pending"
  | "alreadyOwned"
  | "network"
  | "notAllowed"
  | "unavailable"
  | "unknown";

/** RevenueCat hata koduna göre kullanıcıya gösterilecek hata türü. */
export function purchaseErrorKind(e: unknown): PurchaseErrorKind {
  switch ((e as { code?: string } | null)?.code) {
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return "pending";
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
    case PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR:
      return "alreadyOwned";
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
      return "network";
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
    case PURCHASES_ERROR_CODE.INSUFFICIENT_PERMISSIONS_ERROR:
      return "notAllowed";
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
    case PURCHASES_ERROR_CODE.CONFIGURATION_ERROR:
      return "unavailable";
    default:
      return "unknown";
  }
}

export interface PurchaseResult {
  info: CustomerInfo | null;
  /** Kullanıcı iptal ettiyse hata gösterme. */
  cancelled: boolean;
  error?: PurchaseErrorKind;
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
    return { info: null, cancelled: false, error: purchaseErrorKind(e) };
  }
}

/**
 * Paywall gösterimini RevenueCat'e bildirir (panelde dönüşüm oranı için).
 * Analitik amaçlıdır; hata kullanıcıya yansımaz.
 */
export async function trackPaywallImpression(offeringId?: string): Promise<void> {
  if (!_configured) return;
  try {
    await Purchases.trackCustomPaywallImpression({
      paywallId: PAYWALL_ID,
      offeringId: offeringId ?? null,
    });
  } catch (e) {
    if (__DEV__) console.warn("[revenuecat] paywall impression failed:", e);
  }
}

/**
 * Aboneliği yönetme adresi: RevenueCat'in verdiği mağaza bağlantısı, yoksa
 * platformun abonelikler sayfası.
 */
export function managementUrl(info: CustomerInfo | null): string {
  if (info?.managementURL) return info.managementURL;
  return Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions";
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
