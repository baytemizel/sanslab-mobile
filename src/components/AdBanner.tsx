import React, { useSyncExternalStore } from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

import { BANNER_UNIT_ID } from "../services/ads";
import {
  adRequestOptions,
  canRequestAds,
  subscribeToConsent,
} from "../services/consent";
import { useApp } from "../state/AppContext";
import { showsAds } from "../premium/gates";

/**
 * Premium kullanıcılarda ve UMP rızası alınmadan HİÇBİR ŞEY göstermez.
 * (Rıza olmadan reklam isteği yapmak Google politikasını ihlal eder.)
 *
 * Rıza akışı asenkron olduğu için sonucu abonelikle dinleriz; rıza gelince
 * banner kendiliğinden görünür.
 */
export default function AdBanner() {
  const { isPremium } = useApp();
  const consentReady = useSyncExternalStore(
    subscribeToConsent,
    canRequestAds,
    () => false
  );

  if (!showsAds({ isPremium })) return null;
  if (!consentReady) return null;

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={adRequestOptions()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 4 },
});
