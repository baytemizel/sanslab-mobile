/**
 * Firebase başlatma / Firebase init
 *
 * Analytics + Crashlytics. Kullanıcı hesabı ZORUNLU DEĞİLDİR — uygulama
 * üyeliksiz çalışır (bkz. src/services/auth.ts).
 *
 * `google-services.json` / `GoogleService-Info.plist` yoksa app.config.ts
 * Firebase eklentilerini devre dışı bırakır ve buradaki her çağrı sessizce
 * atlanır; uygulama yine de normal çalışır.
 */

import analytics from "@react-native-firebase/analytics";
import crashlytics from "@react-native-firebase/crashlytics";

import { firebaseEnabled } from "./env";

let _ready = false;

export function isFirebaseReady(): boolean {
  return _ready;
}

export async function initFirebase(): Promise<void> {
  if (_ready || !firebaseEnabled) return;
  try {
    await analytics().setAnalyticsCollectionEnabled(true);
    await crashlytics().setCrashlyticsCollectionEnabled(!__DEV__);
    _ready = true;
  } catch (e) {
    // Native modüller Expo Go'da bulunmaz; dev client / build gerekir.
    if (__DEV__) console.warn("[firebase] init skipped:", e);
  }
}

export async function logEvent(
  name: string,
  params?: Record<string, any>
): Promise<void> {
  if (!_ready) return;
  try {
    await analytics().logEvent(name, params);
  } catch {
    /* no-op */
  }
}

export async function logScreen(name: string): Promise<void> {
  if (!_ready) return;
  try {
    await analytics().logScreenView({ screen_name: name, screen_class: name });
  } catch {
    /* no-op */
  }
}

/** Analytics kullanıcı özellikleri (kişisel veri YAZILMAZ). */
export async function setUserProperties(props: {
  premium?: boolean;
  signedIn?: boolean;
}): Promise<void> {
  if (!_ready) return;
  try {
    if (props.premium !== undefined) {
      await analytics().setUserProperty("premium", props.premium ? "1" : "0");
    }
    if (props.signedIn !== undefined) {
      await analytics().setUserProperty("signed_in", props.signedIn ? "1" : "0");
    }
  } catch {
    /* no-op */
  }
}

export function logError(error: unknown): void {
  if (!_ready) return;
  try {
    crashlytics().recordError(
      error instanceof Error ? error : new Error(String(error))
    );
  } catch {
    /* no-op */
  }
}
