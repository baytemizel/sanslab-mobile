import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { GAMES } from "../src/games/config";
import GameCard from "../src/components/GameCard";
import Ball from "../src/components/Ball";
import { PrimaryButton } from "../src/components/Buttons";
import { useApp } from "../src/state/AppContext";
import { fonts, gameColors, palette } from "../src/theme/colors";

const DISCLAIMER_KEY = "@sanslab/disclaimer-accepted";
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
  const { theme, isPremium } = useApp();
  const insets = useSafeAreaInsets();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DISCLAIMER_KEY).then((v) => {
      if (!v) setShowDisclaimer(true);
    });
  }, []);

  const acceptDisclaimer = () => {
    AsyncStorage.setItem(DISCLAIMER_KEY, "1").catch(() => {});
    setShowDisclaimer(false);
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 20, paddingBottom: 44 }}
      >
        {/* top bar */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Text style={[styles.brand, { color: theme.text }]}>Şans</Text>
            <Text style={[styles.brand, { color: theme.gold }]}>Lab</Text>
          </View>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Feather name="settings" size={19} color={theme.text} />
          </Pressable>
        </View>

        {/* hero */}
        <Text style={[styles.heroTitle, { color: theme.text }]}>{t("home.heroTitle")}</Text>
        <Text style={[styles.heroSub, { color: theme.subText }]}>{t("home.subtitle")}</Text>
        <View style={styles.heroBalls}>
          {HERO_BALLS.map((b) => (
            <Ball key={b.n} value={b.n} color={b.c} size={44} />
          ))}
        </View>

        {/* premium strip */}
        {!isPremium && (
          <Pressable onPress={() => router.push("/paywall")} style={styles.promoWrap}>
            <LinearGradient
              colors={theme.dark ? ["rgba(244,192,74,0.16)", "rgba(244,192,74,0.05)"] : ["#FFF7E4", "#FFF1D2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.promo, { borderColor: theme.dark ? "rgba(244,192,74,0.4)" : "#F0D89A" }]}
            >
              <View style={[styles.crown, { backgroundColor: theme.goldFill }]}>
                <Feather name="star" size={16} color={theme.onGold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.promoTitle, { color: theme.text }]}>{t("premium.title")}</Text>
                <Text style={[styles.promoSub, { color: theme.subText }]}>{t("premium.subtitle")}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.gold} />
            </LinearGradient>
          </Pressable>
        )}

        {/* section */}
        <Text style={[styles.sectionTitle, { color: theme.subText }]}>{t("home.pickGame")}</Text>
        {GAMES.map((g) => (
          <GameCard key={g.id} game={g} onPress={() => router.push(`/game/${g.id}`)} />
        ))}

        <View style={[styles.noteCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Feather name="info" size={14} color={theme.subText} />
          <Text style={[styles.footerNote, { color: theme.subText }]}>{t("disclaimer.short")}</Text>
        </View>
      </ScrollView>

      {/* first-run disclaimer */}
      <Modal visible={showDisclaimer} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: theme.cardSolid, borderColor: theme.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: theme.goldFill }]}>
              <Feather name="alert-circle" size={26} color={theme.onGold} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t("disclaimer.title")}</Text>
            <Text style={[styles.modalBody, { color: theme.subText }]}>{t("disclaimer.body")}</Text>
            <PrimaryButton label={t("disclaimer.accept")} onPress={acceptDisclaimer} variant="gold" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 26 },
  brandRow: { flexDirection: "row" },
  brand: { fontSize: 26, fontFamily: fonts.displayHeavy, fontWeight: "900", letterSpacing: -0.5 },
  iconBtn: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 34, fontFamily: fonts.displayHeavy, fontWeight: "900", letterSpacing: -1, lineHeight: 39 },
  heroSub: { fontSize: 15, fontFamily: fonts.body, marginTop: 8, lineHeight: 21, maxWidth: 300 },
  heroBalls: { flexDirection: "row", marginTop: 22, marginBottom: 8 },
  promoWrap: { marginTop: 14, marginBottom: 26 },
  promo: { flexDirection: "row", alignItems: "center", borderRadius: 20, borderWidth: 1, padding: 15, gap: 13 },
  crown: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  promoTitle: { fontSize: 16, fontFamily: fonts.display, fontWeight: "800" },
  promoSub: { fontSize: 12.5, fontFamily: fonts.body, marginTop: 2 },
  sectionTitle: { fontSize: 12, fontFamily: fonts.bodyBold, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 14 },
  noteCard: { flexDirection: "row", gap: 9, alignItems: "flex-start", borderRadius: 16, borderWidth: 1, padding: 13, marginTop: 8 },
  footerNote: { flex: 1, fontSize: 11.5, fontFamily: fonts.body, lineHeight: 17 },
  modalBg: { flex: 1, backgroundColor: "rgba(5,4,15,0.7)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 26, borderWidth: 1, padding: 26 },
  modalIcon: { width: 56, height: 56, borderRadius: 18, alignSelf: "center", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  modalTitle: { fontSize: 21, fontFamily: fonts.displayHeavy, fontWeight: "900", textAlign: "center", marginBottom: 12 },
  modalBody: { fontSize: 14, fontFamily: fonts.body, lineHeight: 22, textAlign: "center", marginBottom: 22 },
});
