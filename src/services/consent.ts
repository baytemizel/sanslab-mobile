/**
 * UMP (User Messaging Platform) rıza akışı / consent flow
 *
 * AEA + Birleşik Krallık + İsviçre kullanıcıları için Google, kişiselleştirilmiş
 * reklam göstermeden ÖNCE bir rıza formu sunulmasını ZORUNLU tutar. Bu dosya
 * formu yükler/gösterir ve sonucu reklam isteklerinde kullanılmak üzere saklar.
 *
 * Google requires a UMP consent form for EEA/UK/CH users before serving
 * personalised ads. This module gathers consent and exposes the result so ad
 * requests can fall back to non-personalised ads.
 */

import { AdsConsent, AdsConsentStatus } from "react-native-google-mobile-ads";

let _canRequestAds = false;
let _personalised = false;
let _gathered = false;

/**
 * Rıza akışı asenkrondur; sonuç geldiğinde banner gibi bileşenlerin yeniden
 * render olması gerekir. React state'i servis katmanına sokmamak için basit
 * bir abonelik kullanıyoruz.
 */
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

export function subscribeToConsent(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Reklam isteği yapılabilir mi (rıza toplandı ya da gerekli değil)? */
export function canRequestAds(): boolean {
  return _canRequestAds;
}

/** Kişiselleştirilmiş reklam gösterilebilir mi? */
export function isPersonalisedAllowed(): boolean {
  return _personalised;
}

/** Reklam isteklerinde kullanılacak ortak seçenekler. */
export function adRequestOptions() {
  return { requestNonPersonalizedAdsOnly: !_personalised };
}

/**
 * Rızayı toplar. Hata durumunda kişiselleştirilmemiş reklamlara düşer —
 * bu her zaman politikaya uygun güvenli taraftır.
 */
export async function gatherConsent(): Promise<void> {
  if (_gathered) return;
  _gathered = true;

  try {
    const info = await AdsConsent.requestInfoUpdate();

    if (info.isConsentFormAvailable && info.status === AdsConsentStatus.REQUIRED) {
      await AdsConsent.showForm();
    }

    const result = await AdsConsent.getConsentInfo();
    _canRequestAds = result.canRequestAds ?? true;

    const choices = await AdsConsent.getUserChoices();
    _personalised = Boolean(
      choices?.selectPersonalisedAds && choices?.storeAndAccessInformationOnDevice
    );
  } catch (e) {
    // Rıza altyapısı yoksa (ör. Expo Go) reklamlar kişiselleştirilmemiş gider.
    if (__DEV__) console.warn("[consent] gather failed, falling back to NPA:", e);
    _canRequestAds = true;
    _personalised = false;
  } finally {
    notify();
  }
}

/** Ayarlar ekranından "Reklam tercihlerim" ile yeniden açılır (AB zorunluluğu). */
export async function showPrivacyOptions(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    if (!info.isConsentFormAvailable) return false;
    await AdsConsent.showPrivacyOptionsForm();
    const choices = await AdsConsent.getUserChoices();
    _personalised = Boolean(
      choices?.selectPersonalisedAds && choices?.storeAndAccessInformationOnDevice
    );
    notify();
    return true;
  } catch (e) {
    if (__DEV__) console.warn("[consent] privacy options failed:", e);
    return false;
  }
}

/** Test/geliştirme için rıza durumunu sıfırlar. */
export function resetConsent(): void {
  try {
    AdsConsent.reset();
  } catch {
    /* no-op */
  }
  _gathered = false;
  _canRequestAds = false;
  _personalised = false;
}
