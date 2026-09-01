import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import type { PurchasesPackage } from "react-native-purchases";

import { PrimaryButton } from "../src/components/Buttons";
import Backdrop from "../src/components/Backdrop";
import { useApp } from "../src/state/AppContext";
import { getOffering, purchase, restore, hasPremium } from "../src/services/revenuecat";
import { fonts, palette } from "../src/theme/colors";

export default function Paywall() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, refreshPremium } = useApp();
  const insets = useSafeAreaInsets();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const off = await getOffering();
      const pkgs = off?.availablePackages ?? [];
      setPackages(pkgs);
      setSelected(pkgs.find((p) => p.packageType === "ANNUAL") ?? pkgs[0] ?? null);
      setLoading(false);
    })();
  }, []);

  const benefits = [
    t("premium.benefit1"),
    t("premium.benefit2"),
    t("premium.benefit3"),
    t("premium.benefit4"),
    t("premium.benefit5"),
  ];

  const doPurchase = async () => {
    if (!selected) return;
    setBusy(true);
    const info = await purchase(selected);
    setBusy(false);
    if (info && hasPremium(info)) {
      await refreshPremium();
      router.back();
    }
  };

  const doRestore = async () => {
    setBusy(true);
    const info = await restore();
    setBusy(false);
    if (info && hasPremium(info)) {
      await refreshPremium();
      router.back();
    }
  };

  return (
    <View style={styles.flex}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.closeBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>

        {/* gold crown orb */}
        <View style={styles.crownWrap}>
          <View style={[styles.crownGlow, { backgroundColor: palette.gold }]} />
          <Svg width={84} height={84}>
            <Defs>
              <RadialGradient id="crownG" cx="36%" cy="30%" r="80%">
                <Stop offset="0" stopColor={palette.goldBright} stopOpacity={1} />
                <Stop offset="1" stopColor={palette.goldDeep} stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Circle cx={42} cy={42} r={40} fill="url(#crownG)" />
          </Svg>
          <Feather name="star" size={34} color="#3A2A05" style={StyleSheet.absoluteFill} />
          <View style={styles.crownStarCenter}>
            <Feather name="star" size={34} color="#3A2A05" />
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>{t("premium.title")}</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>{t("premium.subtitle")}</Text>

        <View style={[styles.benefits, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {benefits.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={[styles.check, { backgroundColor: theme.goldFill }]}>
                <Feather name="check" size={13} color={theme.onGold} />
              </View>
              <Text style={[styles.benefitText, { color: theme.text }]}>{b}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.gold} style={{ marginVertical: 30 }} />
        ) : packages.length === 0 ? (
          <Text style={[styles.note, { color: theme.subText }]}>{t("premium.noOffering")}</Text>
        ) : (
          <View style={{ gap: 12, marginTop: 4 }}>
            {packages.map((p) => {
              const active = selected?.identifier === p.identifier;
              return (
                <Pressable
                  key={p.identifier}
                  onPress={() => setSelected(p)}
                  style={[styles.pkg, { borderColor: active ? theme.goldFill : theme.border, backgroundColor: active ? (theme.dark ? "rgba(244,192,74,0.08)" : "#FFFBF0") : theme.card, borderWidth: active ? 2 : 1 }]}
                >
                  <View style={styles.radio}>
                    <View style={[styles.radioOuter, { borderColor: active ? theme.goldFill : theme.border }]}>
                      {active && <View style={[styles.radioInner, { backgroundColor: theme.goldFill }]} />}
                    </View>
                    <View>
                      <Text style={[styles.pkgTitle, { color: theme.text }]}>{p.product.title}</Text>
                      <Text style={[styles.pkgPeriod, { color: theme.subText }]}>{p.packageType}</Text>
                    </View>
                  </View>
                  <Text style={[styles.pkgPrice, { color: theme.gold }]}>{p.product.priceString}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: 22 }}>
          <PrimaryButton label={t("premium.cta")} onPress={doPurchase} loading={busy} disabled={!selected} variant="gold" />
          <Pressable onPress={doRestore} style={styles.restore}>
            <Text style={[styles.restoreText, { color: theme.subText }]}>{t("premium.restore")}</Text>
          </Pressable>
          <Text style={[styles.legal, { color: theme.subText }]}>{t("premium.legalNote")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  closeBtn: { alignSelf: "flex-end", width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  crownWrap: { width: 84, height: 84, alignSelf: "center", alignItems: "center", justifyContent: "center", marginTop: 10, marginBottom: 18 },
  crownGlow: { position: "absolute", width: 108, height: 108, borderRadius: 54, opacity: 0.4 },
  crownStarCenter: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontFamily: fonts.displayHeavy, fontWeight: "900", textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: fonts.body, textAlign: "center", marginTop: 8, marginBottom: 26 },
  benefits: { gap: 16, marginBottom: 24, borderRadius: 22, borderWidth: 1, padding: 20 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  benefitText: { fontSize: 15, fontFamily: fonts.bodyMed, fontWeight: "600", flex: 1 },
  pkg: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 18, padding: 16 },
  radio: { flexDirection: "row", alignItems: "center", gap: 13 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  pkgTitle: { fontSize: 16, fontFamily: fonts.display, fontWeight: "800" },
  pkgPeriod: { fontSize: 12, fontFamily: fonts.body, marginTop: 2 },
  pkgPrice: { fontSize: 19, fontFamily: fonts.displayHeavy, fontWeight: "900" },
  note: { fontSize: 13, fontFamily: fonts.body, textAlign: "center", marginVertical: 24, lineHeight: 19 },
  restore: { alignItems: "center", paddingVertical: 16 },
  restoreText: { fontSize: 14, fontFamily: fonts.bodySemi, fontWeight: "700" },
  legal: { fontSize: 11, fontFamily: fonts.body, lineHeight: 16, textAlign: "center", marginTop: 2 },
});
