/**
 * AdMob reklam servisi / AdMob ads service (react-native-google-mobile-ads)
 *
 * Premium kullanıcılara reklam GÖSTERİLMEZ. Banner oyun ekranının altında,
 * interstitial ise birkaç üretimde bir gösterilir (free katman).
 *
 * Akış: UMP rızası → mobileAds().initialize() → interstitial ön-yükleme.
 * Rıza alınmadan reklam isteği yapılmaz (Google politikası).
 *
 * Gerçek reklam birimi kimlikleri `app.json -> extra.admob` altındadır;
 * geliştirmede ve kimlikler placeholder iken Google TestIds kullanılır.
 */

import mobileAds, {
  TestIds,
  InterstitialAd,
  AdEventType,
  MaxAdContentRating,
} from "react-native-google-mobile-ads";
import { Platform } from "react-native";

import { admobUnits } from "./env";
import { adRequestOptions, canRequestAds, gatherConsent } from "./consent";

const useTestIds = __DEV__;

export const BANNER_UNIT_ID = useTestIds
  ? TestIds.BANNER
  : (Platform.OS === "ios" ? admobUnits.bannerIos : admobUnits.bannerAndroid) ??
    TestIds.BANNER;

const INTERSTITIAL_UNIT_ID = useTestIds
  ? TestIds.INTERSTITIAL
  : (Platform.OS === "ios"
      ? admobUnits.interstitialIos
      : admobUnits.interstitialAndroid) ?? TestIds.INTERSTITIAL;

/** Kaç üretimde bir interstitial gösterilsin. */
const INTERSTITIAL_EVERY = 4;
/** İki interstitial arasında en az bu kadar süre geçsin (kullanıcı deneyimi). */
const MIN_INTERSTITIAL_GAP_MS = 90_000;

let _generationCount = 0;
let _lastShownAt = 0;
let _interstitial: InterstitialAd | null = null;
let _loaded = false;
let _initialised = false;
let _unsubscribe: (() => void) | null = null;

function loadInterstitial(): void {
  if (!canRequestAds()) return;

  _unsubscribe?.();
  _interstitial = InterstitialAd.createForAdRequest(
    INTERSTITIAL_UNIT_ID,
    adRequestOptions()
  );
  _loaded = false;

  const unsubLoaded = _interstitial.addAdEventListener(AdEventType.LOADED, () => {
    _loaded = true;
  });
  const unsubError = _interstitial.addAdEventListener(AdEventType.ERROR, () => {
    _loaded = false;
  });
  const unsubClosed = _interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    _loaded = false;
    loadInterstitial(); // bir sonraki için önceden yükle
  });

  _unsubscribe = () => {
    unsubLoaded();
    unsubError();
    unsubClosed();
  };

  try {
    _interstitial.load();
  } catch {
    /* no-op */
  }
}

/**
 * Uygulama açılışında bir kez çağrılır. Rızayı toplar, SDK'yı başlatır ve ilk
 * interstitial'ı ön-yükler. Premium kullanıcı için çağrılmasa da zararsızdır.
 */
export async function initAds(): Promise<void> {
  if (_initialised) return;
  _initialised = true;

  try {
    await gatherConsent();
    if (!canRequestAds()) return;

    await mobileAds().setRequestConfiguration({
      // Uygulama 18+ olsa da reklam içeriğini ergen seviyesiyle sınırlıyoruz.
      maxAdContentRating: MaxAdContentRating.T,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await mobileAds().initialize();
    loadInterstitial();
  } catch (e) {
    if (__DEV__) console.warn("[ads] init skipped:", e);
  }
}

/**
 * Üretim sonrası çağrılır. Premium ise hiçbir şey yapmaz. Belirli aralıklarla
 * ve en az `MIN_INTERSTITIAL_GAP_MS` bekleyerek interstitial gösterir.
 */
export function onGenerateForAds(isPremium: boolean): void {
  if (isPremium || !_initialised || !canRequestAds()) return;

  _generationCount += 1;
  if (_generationCount % INTERSTITIAL_EVERY !== 0) return;
  if (!_loaded || !_interstitial) return;
  if (Date.now() - _lastShownAt < MIN_INTERSTITIAL_GAP_MS) return;

  try {
    _lastShownAt = Date.now();
    _interstitial.show();
  } catch {
    /* no-op */
  }
}

/** Premium satın alındığında bekleyen reklamları serbest bırakır. */
export function teardownAds(): void {
  _unsubscribe?.();
  _unsubscribe = null;
  _interstitial = null;
  _loaded = false;
}

/** Testler için sayaçları sıfırlar. */
export function __resetAdsState(): void {
  _generationCount = 0;
  _lastShownAt = 0;
  _initialised = false;
  teardownAds();
}
