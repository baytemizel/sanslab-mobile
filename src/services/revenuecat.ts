/**
 * RevenueCat entegrasyonu / RevenueCat integration
 *
 * Entitlement: "premium"
 * Offering   : "default" (aylık / yıllık / lifetime paketleri)
 *
 * API anahtarlarını app.json -> extra altından ya da .env'den okuyabilirsin.
 * Aşağıda extra.revenuecat içinden okunuyor.
 */

import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const PREMIUM_ENTITLEMENT = "premium";

const keys = (Constants.expoConfig?.extra as any)?.revenuecat ?? {};
const API_KEY_IOS = keys.ios ?? "appl_PLACEHOLDER";
const API_KEY_ANDROID = keys.android ?? "goog_PLACEHOLDER";

let _configured = false;

export async function initPurchases(): Promise<void> {
  if (_configured) return;
  try {
    const apiKey = Platform.OS === "ios" ? API_KEY_IOS : API_KEY_ANDROID;
    Purchases.configure({ apiKey });
    if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    _configured = true;
  } catch (e) {
    if (__DEV__) console.warn("RevenueCat init skipped:", e);
  }
}

export function hasPremium(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function getOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
}

export async function purchase(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e: any) {
    if (!e?.userCancelled && __DEV__) console.warn("purchase error", e);
    return null;
  }
}

export async function restore(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

export function addCustomerInfoListener(
  cb: (info: CustomerInfo) => void
): () => void {
  Purchases.addCustomerInfoUpdateListener(cb);
  return () => Purchases.removeCustomerInfoUpdateListener(cb);
}
