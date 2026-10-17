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
  /** Favori durumu (geçmiş ekranında). */
  favorite?: boolean;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  /** Geçmişte hangi oyuna ait olduğunu göstermek için. */
  subtitle?: string;
}

/** Üretilen tek kupon: çuha benzeri tepside parlayan toplar. */
export default function CouponRow({
  coupon,
  color,
  index,
  onCopied,
  favorite,
  onToggleFavorite,
  onDelete,
  subtitle,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useApp();

  const copy = async () => {
    await Clipboard.setStringAsync(couponToText(coupon));
    onCopied?.();
  };

  const score =
    typeof coupon.score === "number" ? (
      <Text style={[styles.scoreBadge, { color }]}>
        {t("generator.scoreLabel")} {coupon.score >= 0 ? "+" : ""}
        {coupon.score.toFixed(3)}
      </Text>
    ) : null;

  return (
    <View
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.header}>
        <View style={styles.idxWrap}>
          {typeof index === "number" && (
            <>
              <View style={[styles.idxDot, { backgroundColor: color }]} />
              <Text style={[styles.rowLabel, { color: theme.subText }]}>
                {t("generator.rowLabel")} {index + 1}
              </Text>
            </>
          )}
          {subtitle ? (
            <Text style={[styles.rowLabel, { color: theme.subText }]}>{subtitle}</Text>
          ) : null}
          {score}
        </View>

        <View style={styles.actions}>
          {onToggleFavorite && (
            <Pressable
              hitSlop={10}
              onPress={onToggleFavorite}
              accessibilityRole="button"
              accessibilityLabel={t("history.favorite")}
              style={[styles.iconBtn, { borderColor: theme.border }]}
            >
              <Feather
                name="star"
                size={14}
                color={favorite ? theme.goldFill : theme.subText}
              />
            </Pressable>
          )}
          <Pressable
            hitSlop={10}
            onPress={copy}
            accessibilityRole="button"
            accessibilityLabel={t("common.copy")}
            style={[styles.iconBtn, { borderColor: theme.border }]}
          >
            <Feather name="copy" size={14} color={theme.subText} />
          </Pressable>
          {onDelete && (
            <Pressable
              hitSlop={10}
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel={t("history.remove")}
              style={[styles.iconBtn, { borderColor: theme.border }]}
            >
              <Feather name="trash-2" size={14} color={theme.subText} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.poolsWrap}>
        {coupon.pools.map((pool, pi) => (
          <View key={pool.id} style={styles.poolRow}>
            {pi > 0 && <View style={[styles.divider, { backgroundColor: theme.hairline }]} />}
            <Text
              style={[
                styles.poolLabel,
                { color: pool.id === "main" ? theme.subText : color },
              ]}
            >
              {t(pool.labelKey)}
            </Text>
            <View style={styles.balls}>
              {pool.numbers.map((n, ni) => (
                <Ball
                  key={`${pool.id}-${n}-${ni}`}
                  value={n}
                  color={color}
                  special={pool.id !== "main"}
                  size={32}
                  gap={0}
                />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    minHeight: 30,
  },
  idxWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" },
  actions: { flexDirection: "row", alignItems: "center", gap: 7 },
  idxDot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: {
    fontSize: 12.5,
    fontFamily: fonts.bodySemi,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  scoreBadge: {
    fontSize: 11.5,
    fontFamily: fonts.bodyBold,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  poolsWrap: { gap: 2 },
  poolRow: { marginTop: 2 },
  divider: { height: 1, marginTop: 22, marginBottom: 22 },
  poolLabel: {
    fontSize: 10.5,
    fontFamily: fonts.bodyBold,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: "center",
  },
  balls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 21,
    rowGap: 14,
  },
});
