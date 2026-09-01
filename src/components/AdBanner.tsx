import React from "react";
import { View, StyleSheet } from "react-native";
import {
  BannerAd,
  BannerAdSize,
} from "react-native-google-mobile-ads";

import { BANNER_UNIT_ID } from "../services/ads";
import { useApp } from "../state/AppContext";

/** Premium kullanıcılarda hiçbir şey göstermez. */
export default function AdBanner() {
  const { isPremium } = useApp();
  if (isPremium) return null;

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", paddingVertical: 4 },
});
