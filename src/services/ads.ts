/**
 * AdMob reklam servisi / AdMob ads service (react-native-google-mobile-ads)
 *
 * Premium kullanıcılara reklam GÖSTERİLMEZ. Banner her oyun ekranının altında,
 * interstitial ise birkaç üretimde bir gösterilir (free tier).
 *
 * Gerçek reklam birimi kimliklerini app.json -> extra.admob altına koy.
 * Geliştirme sırasında TestIds kullanılır.
 */

import {
  TestIds,
  InterstitialAd,
  AdEventType,
} from "react-native-google-mobile-ads";
import { Platform } from "react-native";
import Constants from "expo-constants";

const admob = (Constants.expoConfig?.extra as any)?.admob ?? {};

export const BANNER_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : Platform.OS === "ios"
  ? admob.bannerIos ?? TestIds.BANNER
  : admob.bannerAndroid ?? TestIds.BANNER;

const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === "ios"
  ? admob.interstitialIos ?? TestIds.INTERSTITIAL
  : admob.interstitialAndroid ?? TestIds.INTERSTITIAL;

// Kaç üretimde bir interstitial gösterilsin
const INTERSTITIAL_EVERY = 4;
let _generationCount = 0;
let _interstitial: InterstitialAd | null = null;
let _loaded = false;

function loadInterstitial() {
  _interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  _loaded = false;
  const unsubLoaded = _interstitial.addAdEventListener(
    AdEventType.LOADED,
    () => {
      _loaded = true;
    }
  );
  const unsubClosed = _interstitial.addAdEventListener(
    AdEventType.CLOSED,
    () => {
      unsubLoaded();
      unsubClosed();
      loadInterstitial(); // bir sonraki için önceden yükle
    }
  );
  try {
    _interstitial.load();
  } catch {
    /* no-op */
  }
}

export function initAds(): void {
  try {
    loadInterstitial();
  } catch {
    /* no-op */
  }
}

/**
 * Üretim sonrası çağır. Premium ise hiçbir şey yapmaz. Belirli aralıklarla
 * interstitial gösterir.
 */
export function onGenerateForAds(isPremium: boolean): void {
  if (isPremium) return;
  _generationCount += 1;
  if (_generationCount % INTERSTITIAL_EVERY === 0 && _loaded && _interstitial) {
    try {
      _interstitial.show();
    } catch {
      /* no-op */
    }
  }
}
