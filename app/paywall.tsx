import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";
import type { PurchasesPackage } from "react-native-purchases";

import { PrimaryButton } from "../src/components/Buttons";
import Backdrop from "../src/components/Backdrop";
import { useApp } from "../src/state/AppContext";
import {
  getOffering,
  hasPremium,
  isPurchasesAvailable,
  purchase,
  restore,
} from "../src/services/revenuecat";
import { PREMIUM_BENEFIT_KEYS } from "../src/premium/gates";
import { defaultSelection, periodKey, savingsPercent } from "../src/premium/packages";
import { logEvent } from "../src/services/firebase";
import { links } from "../src/services/env";
import { fonts, palette } from "../src/theme/colors";

export default function Paywall() {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, refreshPremium, isPremium } = useApp();
  const insets = useSafeAreaInsets();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const off = await getOffering();
      if (cancelled) return;
      const pkgs = off?.availablePackages ?? [];
      setPackages(pkgs);
      setSelected(defaultSelection(pkgs));
      setLoading(false);
      logEvent("paywall_view", { packages: pkgs.length });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const doPurchase = useCallback(async () => {
    if (!selected) return;
    setMessage(null);
    setBusy(true);
    const res = await purchase(selected);
    setBusy(false);

    if (res.cancelled) return;
    if (res.info && hasPremium(res.info)) {
      logEvent("purchase_success", { package: selected.identifier });
      await refreshPremium();
      close();
      return;
    }
    setMessage(t("premium.purchaseFailed"));
  }, [selected, refreshPremium, close, t]);

  const doRestore = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    const info = await restore();
    setBusy(false);

    if (info && hasPremium(info)) {
      await refreshPremium();
      close();
      return;
    }
    setMessage(t("premium.restoreNone"));
  }, [refreshPremium, close, t]);

  const priced = packages.map((p) => ({
    packageType: String(p.packageType),
    price: p.product.price,
  }));

  return (
    <View style={styles.flex}>
      <Backdrop />
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={close}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          style={[
            styles.closeBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
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
          <View style={styles.crownStarCenter}>
            <Feather name="star" size={34} color="#3A2A05" />
          </View>
        </View>

        <Text style={[styles.title, !isPremium && styles.premiumTitle, { color: theme.text }]}>
          {isPremium ? t("premium.activeTitle") : t("premium.title")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          {isPremium ? t("premium.activeSubtitle") : t("premium.subtitle")}
        </Text>

        <View
          style={[
            styles.benefits,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {PREMIUM_BENEFIT_KEYS.map((key) => (
            <View key={key} style={styles.benefitRow}>
              <View style={[styles.check, { backgroundColor: theme.goldFill }]}>
                <Feather name="check" size={13} color={theme.onGold} />
              </View>
              <Text style={[styles.benefitText, { color: theme.text }]}>
                {t(key)}
              </Text>
            </View>
          ))}
        </View>

        {isPremium ? (
          <Text style={[styles.note, { color: theme.subText }]}>
            {t("premium.manageNote")}
          </Text>
        ) : loading ? (
          <ActivityIndicator color={theme.gold} style={{ marginVertical: 30 }} />
        ) : packages.length === 0 ? (
          <Text style={[styles.note, { color: theme.subText }]}>
            {isPurchasesAvailable()
              ? t("premium.noOffering")
              : t("premium.storeUnavailable")}
          </Text>
        ) : (
          <View style={{ gap: 12, marginTop: 4 }}>
            {packages.map((p) => {
              const active = selected?.identifier === p.identifier;
              const saving = savingsPercent(
                { packageType: String(p.packageType), price: p.product.price },
                priced
              );
              return (
                <Pressable
                  key={p.identifier}
                  onPress={() => setSelected(p)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.pkg,
                    {
                      borderColor: active ? theme.goldFill : theme.border,
                      backgroundColor: active
                        ? theme.dark
                          ? "rgba(244,192,74,0.08)"
                          : "#FFFBF0"
                        : theme.card,
                      borderWidth: active ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.radio}>
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: active ? theme.goldFill : theme.border },
                      ]}
                    >
                      {active && (
                        <View
                          style={[
                            styles.radioInner,
                            { backgroundColor: theme.goldFill },
                          ]}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.pkgTitleRow}>
                        <Text style={[styles.pkgTitle, { color: theme.text }]}>
                          {t(periodKey(String(p.packageType)))}
                        </Text>
                        {saving !== null && (
                          <View
                            style={[styles.saveBadge, { backgroundColor: theme.goldFill }]}
                          >
                            <Text style={[styles.saveText, { color: theme.onGold }]}>
                              {t("premium.save", { n: saving })}
                            </Text>
                          </View>
                        )}
                      </View>
                      {p.product.introPrice ? (
                        <Text style={[styles.pkgPeriod, { color: theme.gold }]}>
                          {t("premium.trial", {
                            period: p.product.introPrice.periodNumberOfUnits,
                            unit: p.product.introPrice.periodUnit,
                          })}
                        </Text>
                      ) : (
                        <Text style={[styles.pkgPeriod, { color: theme.subText }]}>
                          {p.product.description || p.product.title}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.pkgPrice, { color: theme.gold }]}>
                    {p.product.priceString}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {message && <Text style={styles.message}>{message}</Text>}

        {!isPremium && (
          <View style={{ marginTop: 22 }}>
            <PrimaryButton
              label={t("premium.cta")}
              onPress={doPurchase}
              loading={busy}
              disabled={!selected || busy}
              variant="gold"
            />
            <Pressable onPress={doRestore} disabled={busy} style={styles.restore}>
              <Text style={[styles.restoreText, { color: theme.subText }]}>
                {t("premium.restore")}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Mağaza zorunluluğu: yenileme koşulları + yasal bağlantılar */}
        <Text style={[styles.legal, { color: theme.subText }]}>
          {t("premium.legalNote")}
        </Text>
        <View style={styles.legalLinks}>
          <Pressable onPress={() => Linking.openURL(links.terms)} hitSlop={8}>
            <Text style={[styles.legalLink, { color: theme.gold }]}>
              {t("settings.terms")}
            </Text>
          </Pressable>
          <Text style={[styles.legal, { color: theme.subText }]}>·</Text>
          <Pressable onPress={() => Linking.openURL(links.privacy)} hitSlop={8}>
            <Text style={[styles.legalLink, { color: theme.gold }]}>
              {t("settings.privacy")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  crownWrap: {
    width: 84,
    height: 84,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 18,
  },
  crownGlow: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    opacity: 0.4,
  },
  crownStarCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayHeavy,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  // "Premium" markası serif italik; fontWeight verilmez (Android'de sistem fontuna düşer).
  premiumTitle: { fontFamily: fonts.premium, fontWeight: "normal", fontSize: 34, letterSpacing: 0.3 },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.body,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 26,
  },
  benefits: { gap: 16, marginBottom: 24, borderRadius: 22, borderWidth: 1, padding: 20 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { fontSize: 15, fontFamily: fonts.bodyMed, fontWeight: "600", flex: 1 },
  pkg: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  radio: { flexDirection: "row", alignItems: "center", gap: 13, flex: 1 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  pkgTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pkgTitle: { fontSize: 16, fontFamily: fonts.display, fontWeight: "800" },
  saveBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  saveText: { fontSize: 10.5, fontFamily: fonts.bodyBold, fontWeight: "800" },
  pkgPeriod: { fontSize: 12, fontFamily: fonts.body, marginTop: 3 },
  pkgPrice: { fontSize: 19, fontFamily: fonts.displayHeavy, fontWeight: "900" },
  note: {
    fontSize: 13,
    fontFamily: fonts.body,
    textAlign: "center",
    marginVertical: 24,
    lineHeight: 19,
  },
  message: {
    fontSize: 13,
    fontFamily: fonts.bodyMed,
    color: "#F5333B",
    textAlign: "center",
    marginTop: 16,
  },
  restore: { alignItems: "center", paddingVertical: 16 },
  restoreText: { fontSize: 14, fontFamily: fonts.bodySemi, fontWeight: "700" },
  legal: {
    fontSize: 11,
    fontFamily: fonts.body,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 2,
  },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  legalLink: { fontSize: 11.5, fontFamily: fonts.bodySemi, fontWeight: "700" },
});
