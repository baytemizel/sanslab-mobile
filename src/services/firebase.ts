/**
 * Firebase başlatma / Firebase init
 *
 * Bu projede Firebase: Analytics + Crashlytics + (opsiyonel) Remote Config
 * için kullanılır. Kullanıcı hesabı / giriş ZORUNLU DEĞİLDİR — uygulama
 * üyeliksiz çalışır.
 *
 * Kurulum:
 *  - android/app/google-services.json
 *  - ios/.../GoogleService-Info.plist
 * dosyalarını ekledikten sonra `app.json` içindeki react-native-firebase
 * eklentileri otomatik bağlanır.
 */

import analytics from "@react-native-firebase/analytics";
import crashlytics from "@react-native-firebase/crashlytics";

let _ready = false;

export async function initFirebase(): Promise<void> {
  if (_ready) return;
  try {
    await analytics().setAnalyticsCollectionEnabled(true);
    await crashlytics().setCrashlyticsCollectionEnabled(!__DEV__);
    _ready = true;
  } catch (e) {
    // Native modüller Expo Go'da bulunmaz; dev client / build gerekir.
    if (__DEV__) console.warn("Firebase init skipped:", e);
  }
}

export async function logEvent(
  name: string,
  params?: Record<string, any>
): Promise<void> {
  try {
    await analytics().logEvent(name, params);
  } catch {
    /* no-op */
  }
}

export function logError(error: unknown): void {
  try {
    crashlytics().recordError(
      error instanceof Error ? error : new Error(String(error))
    );
  } catch {
    /* no-op */
  }
}
