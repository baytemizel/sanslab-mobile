/**
 * Yapılandırma okuma + placeholder tespiti / Config reading + placeholder detection
 *
 * Depoda gerçek anahtarlar yoktur. Bir anahtar hâlâ placeholder ise ilgili SDK
 * HİÇ başlatılmaz — böylece uygulama anahtarsız da çökmeden çalışır.
 *
 * The repo ships without real keys. When a key is still a placeholder the
 * matching SDK is never initialised, so the app runs (ad-free, free tier)
 * without crashing.
 */
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;

const PLACEHOLDER_MARKERS = [
  "REPLACE",
  "PLACEHOLDER",
  "XXXX",
  "xxx",
  "_ME",
];

/** Değer boş ya da hâlâ şablon metni mi? */
export function isPlaceholder(value: unknown): boolean {
  if (typeof value !== "string" || value.trim().length === 0) return true;
  const v = value.toUpperCase();
  return PLACEHOLDER_MARKERS.some((m) => v.includes(m.toUpperCase()));
}

/** Placeholder ise `undefined`, değilse değerin kendisi. */
export function realValue(value: unknown): string | undefined {
  return isPlaceholder(value) ? undefined : (value as string);
}

export const revenueCatKeys = {
  ios: realValue(extra.revenuecat?.ios),
  android: realValue(extra.revenuecat?.android),
};

export const admobUnits = {
  bannerAndroid: realValue(extra.admob?.bannerAndroid),
  bannerIos: realValue(extra.admob?.bannerIos),
  interstitialAndroid: realValue(extra.admob?.interstitialAndroid),
  interstitialIos: realValue(extra.admob?.interstitialIos),
};

export const authConfig = {
  googleWebClientId: realValue(extra.auth?.googleWebClientId),
  /** app.config.ts yalnızca Facebook eklentisi devredeyken doldurur. */
  facebookAppId: realValue(extra.auth?.facebookAppId),
};

/** app.config.ts, Firebase servis dosyası bulunca `true` yazar. */
export const firebaseEnabled: boolean = extra.firebaseEnabled === true;

export const links = {
  privacy: (extra.links?.privacy as string) ?? "https://odit.com.tr/sanslab/privacy",
  terms: (extra.links?.terms as string) ?? "https://odit.com.tr/sanslab/terms",
  support: (extra.links?.support as string) ?? "mailto:support@odit.com.tr",
};

export const appVersion = Constants.expoConfig?.version ?? "1.0.0";
