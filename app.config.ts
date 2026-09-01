/**
 * Dinamik Expo yapılandırması / Dynamic Expo config
 *
 * `app.json` statik temeldir. Bu dosya, gizli dosyaların (Firebase servis
 * dosyaları) VARLIĞINA göre yapılandırmayı düzeltir; böylece depoyu yeni
 * klonlayan biri hiçbir gizli anahtar olmadan da `expo prebuild` + `run:android`
 * yapabilir. Anahtarlar `.env` / CI ortam değişkenleriyle de geçilebilir.
 *
 * app.json is the static base. This file patches it based on whether the
 * secret Firebase service files exist, so a fresh clone can prebuild and run
 * with zero secrets. Keys can also be supplied via environment variables.
 */
import fs from "fs";
import path from "path";
import type { ConfigContext, ExpoConfig } from "expo/config";

const ROOT = __dirname;
const ANDROID_GOOGLE_SERVICES = path.join(ROOT, "google-services.json");
const IOS_GOOGLE_SERVICES = path.join(ROOT, "GoogleService-Info.plist");

const fileExists = fs.existsSync(ANDROID_GOOGLE_SERVICES);
const hasIosFirebase = fs.existsSync(IOS_GOOGLE_SERVICES);

/** google-services.json içindeki Android paket adlarını okur. */
function googleServicesPackages(): string[] {
  if (!fileExists) return [];
  try {
    const json = JSON.parse(fs.readFileSync(ANDROID_GOOGLE_SERVICES, "utf8"));
    return (json.client ?? [])
      .map((c: any) => c?.client_info?.android_client_info?.package_name)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Firebase yapılandırma dosyası olmadan bu eklentiler Gradle/Pod derlemesini kırar. */
const FIREBASE_PLUGINS = [
  "@react-native-firebase/app",
  "@react-native-firebase/auth",
  "@react-native-firebase/crashlytics",
];

const pluginName = (p: unknown): string =>
  Array.isArray(p) ? String(p[0]) : String(p);

export default ({ config }: ConfigContext): ExpoConfig => {
  const base = config as ExpoConfig;
  const appPackage = base.android?.package;

  /**
   * google-services.json'daki paket adı uygulamanınkiyle eşleşmezse Gradle
   * `processDebugGoogleServices` adımında "No matching client found" ile
   * DERLEMEYİ KIRAR. Bu durumda sessizce kırılmak yerine Firebase'i devre dışı
   * bırakıp yüksek sesle uyarıyoruz.
   */
  const gsPackages = googleServicesPackages();
  const packageMatches =
    gsPackages.length === 0 || (!!appPackage && gsPackages.includes(appPackage));

  const hasAndroidFirebase = fileExists && packageMatches;
  const hasFirebase = hasAndroidFirebase || hasIosFirebase;

  const plugins = (base.plugins ?? []).filter(
    (p) => hasFirebase || !FIREBASE_PLUGINS.includes(pluginName(p))
  );

  if (fileExists && !packageMatches) {
    console.warn(
      `\n[app.config] ⚠️  PAKET ADI UYUŞMAZLIĞI\n` +
        `  app.json  → android.package = "${appPackage}"\n` +
        `  google-services.json → ${gsPackages.map((p) => `"${p}"`).join(", ")}\n` +
        `  Derleme kırılmasın diye Firebase eklentileri DEVRE DIŞI bırakıldı.\n` +
        `  Çözüm: ya app.json'daki paket adını düzelt, ya Firebase Console'da bu\n` +
        `  paket adı için bir Android uygulaması ekleyip dosyayı yeniden indir.\n`
    );
  } else if (!hasFirebase) {
    console.warn(
      "[app.config] google-services.json / GoogleService-Info.plist bulunamadı — " +
        "Firebase eklentileri devre dışı. Analytics/Crashlytics/Auth çalışmaz, derleme çalışır."
    );
  }

  const env = process.env;

  return {
    ...base,
    plugins,
    android: {
      ...base.android,
      googleServicesFile: hasAndroidFirebase
        ? "./google-services.json"
        : undefined,
    },
    ios: {
      ...base.ios,
      googleServicesFile: hasIosFirebase
        ? "./GoogleService-Info.plist"
        : undefined,
    },
    extra: {
      ...base.extra,
      firebaseEnabled: hasFirebase,
      revenuecat: {
        ios: env.REVENUECAT_IOS_KEY ?? (base.extra as any)?.revenuecat?.ios,
        android:
          env.REVENUECAT_ANDROID_KEY ?? (base.extra as any)?.revenuecat?.android,
      },
      admob: {
        bannerAndroid:
          env.ADMOB_BANNER_ANDROID ?? (base.extra as any)?.admob?.bannerAndroid,
        bannerIos: env.ADMOB_BANNER_IOS ?? (base.extra as any)?.admob?.bannerIos,
        interstitialAndroid:
          env.ADMOB_INTERSTITIAL_ANDROID ??
          (base.extra as any)?.admob?.interstitialAndroid,
        interstitialIos:
          env.ADMOB_INTERSTITIAL_IOS ??
          (base.extra as any)?.admob?.interstitialIos,
      },
      auth: {
        googleWebClientId:
          env.GOOGLE_WEB_CLIENT_ID ??
          (base.extra as any)?.auth?.googleWebClientId,
      },
    },
  };
};
