import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";
import { Feather } from "@expo/vector-icons";

import Ball from "./Ball";
import { Coupon, couponToText } from "../games/generator";
import { useApp } from "../state/AppContext";
import { fonts } from "../theme/colors";

interface Props {
  coupon: Coupon;
  color: string;
  index?: number;
  onCopied?: () => void;
}

/** Üretilen tek kupon: çuha benzeri tepside parlayan toplar. */
export default function CouponRow({ coupon, color, index, onCopied }: Props) {
  const { t } = useTranslation();
  const { theme } = useApp();

  const copy = async () => {
    await Clipboard.setStringAsync(couponToText(coupon));
    onCopied?.();
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        {typeof index === "number" ? (
          <View style={styles.idxWrap}>
            <View style={[styles.idxDot, { backgroundColor: color }]} />
            <Text style={[styles.rowLabel, { color: theme.subText }]}>
              {t("generator.rowLabel")} {index + 1}
            </Text>
            {typeof coupon.score === "number" && (
              <Text style={[styles.scoreBadge, { color }]}>
                {t("generator.scoreLabel")} {coupon.score >= 0 ? "+" : ""}
                {coupon.score.toFixed(3)}
              </Text>
            )}
          </View>
        ) : typeof coupon.score === "number" ? (
          <Text style={[styles.scoreBadge, { color }]}>
            {t("generator.scoreLabel")} {coupon.score >= 0 ? "+" : ""}
            {coupon.score.toFixed(3)}
          </Text>
        ) : (
          <View />
        )}
        <Pressable hitSlop={10} onPress={copy} style={[styles.copyBtn, { borderColor: theme.border }]}>
          <Feather name="copy" size={14} color={theme.subText} />
        </Pressable>
      </View>

      <View style={styles.poolsWrap}>
        {coupon.pools.map((pool, pi) => (
          <View key={pool.id} style={styles.poolRow}>
            {pi > 0 && <View style={[styles.divider, { backgroundColor: theme.hairline }]} />}
            <Text style={[styles.poolLabel, { color: pool.id === "main" ? theme.subText : color }]}>
              {t(pool.labelKey)}
            </Text>
            <View style={styles.balls}>
              {pool.numbers.map((n, ni) => (
                <Ball key={`${pool.id}-${n}-${ni}`} value={n} color={color} special={pool.id !== "main"} size={44} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, padding: 16, marginBottom: 13 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  idxWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  idxDot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { fontSize: 12.5, fontFamily: fonts.bodySemi, fontWeight: "700", letterSpacing: 0.3 },
  scoreBadge: { fontSize: 11.5, fontFamily: fonts.bodyBold, fontWeight: "800", letterSpacing: 0.4, marginLeft: 8 },
  copyBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  poolsWrap: { gap: 2 },
  poolRow: { marginTop: 2 },
  divider: { height: 1, marginVertical: 12 },
  poolLabel: { fontSize: 10.5, fontFamily: fonts.bodyBold, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  balls: { flexDirection: "row", flexWrap: "wrap" },
});
