import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  AccessibilityInfo,
  Animated,
  Easing,
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
  getCustomerInfo,
  getOffering,
  hasPremium,
  isPurchasesAvailable,
  managementUrl,
  purchase,
  restore,
  trackPaywallImpression,
  type PurchaseErrorKind,
} from "../src/services/revenuecat";
import { PREMIUM_BENEFIT_KEYS } from "../src/premium/gates";
import {
  LIST_PRICES_USD,
  formatUsd,
  periodKey,
  savingsPercent,
} from "../src/premium/packages";
import { logEvent } from "../src/services/firebase";
import { links } from "../src/services/env";
import { fonts, palette } from "../src/theme/colors";

/** Sunulan ödeme periyotları: RevenueCat "default" offering'indeki $rc_monthly / $rc_annual. */
const PLANS = ["MONTHLY", "ANNUAL"] as const;
type Plan = (typeof PLANS)[number];

function packageFor(packages: PurchasesPackage[], plan: Plan): PurchasesPackage | null {
  return packages.find((p) => String(p.packageType) === plan) ?? null;
}

/** Satın alma hata türü → i18n anahtarı. */
const ERROR_KEYS: Record<PurchaseErrorKind, string> = {
  pending: "premium.paymentPending",
  alreadyOwned: "premium.alreadyOwned",
  network: "premium.networkError",
  notAllowed: "premium.notAllowed",
  unavailable: "premium.productUnavailable",
  unknown: "premium.purchaseFailed",
};

type Message = { text: string; tone: "error" | "info" };

const ORB = 56;
const RING_COUNT = 3;
const RING_PERIOD = 2700;

/** Topun çevresinden dışa yayılıp sönen ince altın halkalar (native sürücü). */
function SignalRings() {
  const rings = useMemo(
    () => Array.from({ length: RING_COUNT }, () => new Animated.Value(0)),
    []
  );

  useEffect(() => {
    let reduce = false;
    const loops = rings.map((v, i) =>
      Animated.loop(
        Animated.timing(v, {
          toValue: 1,
          duration: RING_PERIOD,
          delay: (RING_PERIOD / RING_COUNT) * i,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => (reduce = r))
      .catch(() => {})
      .finally(() => {
        if (!reduce) loops.forEach((l) => l.start());
      });
    return () => loops.forEach((l) => l.stop());
  }, [rings]);

  return (
    <>
      {rings.map((v, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.ring,
            {
              opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] }),
              transform: [
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) },
              ],
            },
          ]}
        />
      ))}
    </>
  );
}

export default function Paywall() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme, refreshPremium, isPremium } = useApp();
  const insets = useSafeAreaInsets();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan>("ANNUAL");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const showError = useCallback((key: string) => setMessage({ text: t(key), tone: "error" }), [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const off = await getOffering();
      if (cancelled) return;
      const pkgs = off?.availablePackages ?? [];
      setPackages(pkgs);
      setLoading(false);
      logEvent("paywall_view", { packages: pkgs.length, offering: off?.identifier ?? "none" });
      // Premium kullanıcı satış ekranı değil "Premium etkin" görür → gösterim sayılmaz.
      if (!isPremium) trackPaywallImpression(off?.identifier);
    })();
    return () => {
      cancelled = true;
    };
    // Gösterim yalnızca açılışta bir kez sayılır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seçilen periyodun mağaza paketi (RevenueCat offering'inde yoksa null).
  const selected = packageFor(packages, selectedPlan);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  const succeed = useCallback(async () => {
    await refreshPremium();
    close();
  }, [refreshPremium, close]);

  const doPurchase = useCallback(async () => {
    let pkg = selected;
    if (!pkg) {
      // Buton hep aktif; bu derlemede mağaza yoksa satın alma akışı açılamaz → kısa uyarı.
      if (!isPurchasesAvailable()) {
        showError("premium.storeUnavailable");
        return;
      }
      // Açılışta paketler yüklenemediyse (ör. bağlantı yoktu) bir kez daha dene.
      setMessage(null);
      setBusy(true);
      const pkgs = (await getOffering())?.availablePackages ?? [];
      setPackages(pkgs);
      pkg = packageFor(pkgs, selectedPlan);
      if (!pkg) {
        setBusy(false);
        showError("premium.offeringFailed");
        return;
      }
    }
    setMessage(null);
    setBusy(true);
    logEvent("purchase_start", { package: pkg.identifier });
    const res = await purchase(pkg);

    if (res.cancelled) {
      setBusy(false);
      logEvent("purchase_cancel", { package: pkg.identifier });
      return;
    }
    if (res.info && hasPremium(res.info)) {
      setBusy(false);
      logEvent("purchase_success", { package: pkg.identifier });
      await succeed();
      return;
    }
    // Abonelik bu mağaza hesabında zaten var: sessizce geri yükleyip bu hesaba bağla.
    if (res.error === "alreadyOwned" && hasPremium(await restore())) {
      setBusy(false);
      logEvent("purchase_restored", { package: pkg.identifier });
      await succeed();
      return;
    }
    setBusy(false);

    // Hata yoksa satın alma geçti ama "premium" entitlement'ı açılmadı (ürün bağlı değil).
    const reason = res.error ?? "entitlement_missing";
    logEvent("purchase_failed", { package: pkg.identifier, reason });
    if (res.error === "pending") {
      // Onaylanınca müşteri dinleyicisi Premium'u açar; ekran "Premium etkin"e döner.
      setMessage({ text: t(ERROR_KEYS.pending), tone: "info" });
      return;
    }
    showError(ERROR_KEYS[res.error ?? "unknown"]);
  }, [selected, selectedPlan, succeed, showError, t]);

  const doRestore = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    const info = await restore();
    setBusy(false);

    if (info && hasPremium(info)) {
      await succeed();
      return;
    }
    showError("premium.restoreNone");
  }, [succeed, showError]);

  const openManage = useCallback(async () => {
    Linking.openURL(managementUrl(await getCustomerInfo())).catch(() => {});
  }, []);

  // Her periyodun fiyatı: mağaza paketi varsa onun, yoksa liste fiyatı.
  const priceOf = (plan: Plan) =>
    packageFor(packages, plan)?.product.price ?? LIST_PRICES_USD[plan];
  const priced = PLANS.map((plan) => ({ packageType: plan, price: priceOf(plan) }));

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

        {/* gold crown orb + dışa doğru yayılan sinyal halkaları */}
        <View style={styles.crownWrap}>
          <SignalRings />
          <Svg width={ORB} height={ORB}>
            <Defs>
              <RadialGradient id="crownG" cx="36%" cy="30%" r="80%">
                <Stop offset="0" stopColor={palette.goldBright} stopOpacity={1} />
                <Stop offset="1" stopColor={palette.goldDeep} stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Circle cx={ORB / 2} cy={ORB / 2} r={ORB / 2 - 1} fill="url(#crownG)" />
          </Svg>
          <View style={styles.crownStarCenter}>
            <Feather name="star" size={23} color="#3A2A05" />
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
          <>
            <Text style={[styles.note, { color: theme.subText }]}>
              {t("premium.manageNote")}
            </Text>
            <Pressable onPress={openManage} accessibilityRole="link" style={styles.manage}>
              <Text style={[styles.restoreText, { color: theme.gold }]}>
                {t("premium.manage")}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: theme.subText }]}>
              {t("premium.billingPeriod")}
            </Text>
            <View style={styles.plans}>
              {PLANS.map((plan) => {
                const pkg = packageFor(packages, plan);
                const active = selectedPlan === plan;
                const saving = savingsPercent({ packageType: plan, price: priceOf(plan) }, priced);
                const priceString = pkg?.product.priceString ?? formatUsd(priceOf(plan), i18n.language);
                const hint =
                  plan === "ANNUAL"
                    ? t("premium.perMonth", {
                        price:
                          pkg?.product.pricePerMonthString ??
                          formatUsd(priceOf(plan) / 12, i18n.language),
                      })
                    : t("premium.monthlyHint");
                return (
                  <Pressable
                    key={plan}
                    onPress={() => setSelectedPlan(plan)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.plan,
                      {
                        borderColor: active ? theme.goldFill : theme.border,
                        backgroundColor: active
                          ? theme.dark
                            ? "rgba(244,192,74,0.12)"
                            : "#FFF6E2"
                          : theme.card,
                      },
                    ]}
                  >
                    {saving !== null && (
                      <View style={[styles.saveBadge, { backgroundColor: theme.goldFill }]}>
                        <Text style={[styles.saveText, { color: theme.onGold }]}>
                          {t("premium.save", { n: saving })}
                        </Text>
                      </View>
                    )}
                    <View style={styles.planHead}>
                      <Text style={[styles.planTitle, { color: theme.text }]}>
                        {t(periodKey(plan))}
                      </Text>
                      <View
                        style={[
                          styles.radioOuter,
                          { borderColor: active ? theme.goldFill : theme.border },
                        ]}
                      >
                        {active && (
                          <View style={[styles.radioInner, { backgroundColor: theme.goldFill }]} />
                        )}
                      </View>
                    </View>
                    {loading ? (
                      <ActivityIndicator color={theme.gold} style={styles.planLoading} />
                    ) : (
                      <Text style={[styles.planPrice, { color: active ? theme.gold : theme.text }]}>
                        {priceString}
                      </Text>
                    )}
                    <Text style={[styles.planHint, { color: theme.subText }]} numberOfLines={2}>
                      {pkg?.product.introPrice
                        ? t("premium.trial", {
                            period: pkg.product.introPrice.periodNumberOfUnits,
                            unit: pkg.product.introPrice.periodUnit,
                          })
                        : hint}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {message && (
          <Text
            style={[styles.message, message.tone === "info" && { color: theme.subText }]}
            accessibilityLiveRegion="polite"
          >
            {message.text}
          </Text>
        )}

        {!isPremium && (
          <View style={{ marginTop: 22 }}>
            <PrimaryButton
              label={t("premium.cta")}
              onPress={doPurchase}
              loading={busy}
              disabled={busy}
              variant="gold"
              labelColor="#fff"
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
    width: ORB,
    height: ORB,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    // halkalar topun 2.2 katına kadar yayılır
    marginTop: 30,
    marginBottom: 26,
  },
  ring: {
    position: "absolute",
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    borderWidth: 1,
    borderColor: palette.gold,
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
  premiumTitle: { fontFamily: fonts.premium, fontWeight: "normal", fontSize: 26, letterSpacing: 0.3 },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    textAlign: "center",
    opacity: 0.7,
    marginTop: 2,
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
  benefitText: { fontSize: 13.5, fontFamily: fonts.bodyMed, fontWeight: "600", flex: 1 },
  sectionLabel: {
    fontSize: 11.5,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    opacity: 0.75,
    marginBottom: 10,
  },
  plans: { flexDirection: "row", gap: 12 },
  plan: { flex: 1, borderRadius: 18, borderWidth: 1.5, padding: 16, paddingTop: 18 },
  planHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planTitle: { fontSize: 16, fontFamily: fonts.display },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  saveBadge: {
    position: "absolute",
    top: -10,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  saveText: { fontSize: 10.5, fontFamily: fonts.bodyBold },
  planPrice: { fontSize: 20, fontFamily: fonts.displayHeavy, marginTop: 12 },
  planLoading: { alignSelf: "flex-start", marginTop: 14, height: 24 },
  planHint: { fontSize: 11.5, fontFamily: fonts.body, marginTop: 4, lineHeight: 16 },
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
  manage: { alignItems: "center", paddingVertical: 4, marginTop: -12, marginBottom: 12 },
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
