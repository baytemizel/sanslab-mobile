import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { GAMES } from "../src/games/config";
import GameCard from "../src/components/GameCard";
import Ball from "../src/components/Ball";
import { useApp } from "../src/state/AppContext";
import { fonts, gameColors } from "../src/theme/colors";

const HERO_BALLS = [
  { n: 7, c: gameColors.sayisal },
  { n: 23, c: gameColors.super },
  { n: 34, c: gameColors.sans },
  { n: 11, c: gameColors.on },
  { n: 49, c: gameColors.hizli },
];

export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, isPremium, history } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 14,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 44,
        }}
      >
        {/* top bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Text style={[styles.brand, { color: theme.text }]}>Şans</Text>
            <Text style={[styles.brand, { color: theme.gold }]}>Lab</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable
              onPress={() => router.push("/history")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("history.title")}
              style={[
                styles.iconBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Feather name="clock" size={19} color={theme.text} />
              {history.length > 0 && (
                <View style={[styles.dot, { backgroundColor: theme.goldFill }]} />
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("common.settings")}
              style={[
                styles.iconBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Feather name="settings" size={19} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {/* hero */}
        <Text style={[styles.heroTitle, { color: theme.text }]}>
          {t("home.heroTitle")}
        </Text>
        <Text style={[styles.heroSub, { color: theme.subText }]}>
          {t("home.subtitle")}
        </Text>
        <View style={styles.heroBalls}>
          {HERO_BALLS.map((b) => (
            <Ball key={b.n} value={b.n} color={b.c} size={44} />
          ))}
        </View>

        {/* premium strip */}
        {!isPremium && (
          <Pressable onPress={() => router.push("/paywall")} style={styles.promoWrap}>
            <LinearGradient
              colors={
                theme.dark
                  ? ["rgba(244,192,74,0.16)", "rgba(244,192,74,0.05)"]
                  : ["#FFF7E4", "#FFF1D2"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.promo,
                { borderColor: theme.dark ? "rgba(244,192,74,0.4)" : "#F0D89A" },
              ]}
            >
              <View style={[styles.crown, { backgroundColor: theme.goldFill }]}>
                <Feather name="star" size={16} color={theme.onGold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.promoTitle, { color: theme.text }]}>
                  {t("premium.title")}
                </Text>
                <Text style={[styles.promoSub, { color: theme.subText }]}>
                  {t("premium.subtitle")}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.gold} />
            </LinearGradient>
          </Pressable>
        )}

        {/* section */}
        <Text style={[styles.sectionTitle, { color: theme.subText }]}>
          {t("home.pickGame")}
        </Text>
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} onPress={() => router.push(`/game/${g.id}`)} />
        ))}

        <View
          style={[
            styles.noteCard,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <Feather name="info" size={14} color={theme.subText} />
          <Text style={[styles.footerNote, { color: theme.subText }]}>
            {t("disclaimer.short")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },
  brandRow: { flexDirection: "row" },
  topActions: { flexDirection: "row", gap: 10 },
  // fontWeight verilmez: Android'de özel fontla birlikte verilince sistem
  // fontuna düşüyordu; kalınlığı doğrudan Sora ExtraBold dosyası taşır.
  brand: {
    fontSize: 26,
    fontFamily: fonts.displayHeavy,
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 4 },
  heroTitle: {
    fontSize: 34,
    fontFamily: fonts.displayHeavy,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 39,
  },
  heroSub: {
    fontSize: 15,
    fontFamily: fonts.body,
    marginTop: 8,
    lineHeight: 21,
    maxWidth: 300,
  },
  // Topun hâlesi çapının 1.5 katı; Ball'ın 9'luk marjına eklenen boşluk
  // hâlelerin üst üste binmesini önler (44'lük topta merkezler arası 69).
  heroBalls: { flexDirection: "row", gap: 16, marginTop: 22, marginBottom: 8 },
  promoWrap: { marginTop: 14, marginBottom: 26 },
  promo: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
    gap: 13,
  },
  crown: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  promoTitle: { fontSize: 19, fontFamily: fonts.premium, letterSpacing: 0.2 },
  promoSub: { fontSize: 12.5, fontFamily: fonts.body, marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  noteCard: {
    flexDirection: "row",
    gap: 9,
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginTop: 8,
  },
  footerNote: { flex: 1, fontSize: 11.5, fontFamily: fonts.body, lineHeight: 17 },
});
