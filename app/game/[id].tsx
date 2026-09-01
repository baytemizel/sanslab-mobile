import React, { useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ToastAndroid, Platform } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { getGame } from "../../src/games/config";
import { generateCoupon, generateCoupons, Coupon, GenMode } from "../../src/games/generator";
import { hasFormula } from "../../src/games/fstats";
import CouponRow from "../../src/components/CouponRow";
import { PrimaryButton, Segmented } from "../../src/components/Buttons";
import AdBanner from "../../src/components/AdBanner";
import { useApp } from "../../src/state/AppContext";
import { onGenerateForAds } from "../../src/services/ads";
import { logEvent } from "../../src/services/firebase";
import { fonts } from "../../src/theme/colors";

type RowMode = "single" | "ten";

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, isPremium } = useApp();
  const insets = useSafeAreaInsets();

  const game = useMemo(() => getGame(String(id)), [id]);

  const [mode, setMode] = useState<GenMode>("random");
  const [rowMode, setRowMode] = useState<RowMode>("single");
  const [count, setCount] = useState(game?.variableCount?.default ?? 6);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const toast = useCallback((msg: string) => {
    if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  }, []);

  if (!game) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.text }}>Game not found</Text>
      </View>
    );
  }

  const requirePremium = (reasonKey: string) => {
    if (isPremium) return false;
    toast(t(reasonKey));
    router.push("/paywall");
    return true;
  };

  const generate = () => {
    // Tekli ve 10'lu üretim herkese açık. Sadece akıllı modlar (dengeli/frekans) Premium.
    if (mode !== "random" && requirePremium("premium.unlockMode")) return;
    const opts = { mode, variableCount: count };
    const result = rowMode === "ten" ? generateCoupons(game, 10, opts) : [generateCoupon(game, opts)];
    setCoupons(result);
    onGenerateForAds(isPremium);
    logEvent("generate_coupon", { game: game.id, mode, rows: result.length });
  };

  const modeOptions: { value: GenMode; label: string }[] = [
    { value: "random", label: t("generator.modeRandom") },
    { value: "balanced", label: t("generator.modeBalanced") },
    { value: "lowshare", label: t("generator.modeLowShare") },
    ...(hasFormula(game.id)
      ? [{ value: "formula" as GenMode, label: t("generator.modeFormula") }]
      : []),
  ];

  const modeDesc =
    mode === "random" ? t("generator.modeRandomDesc")
    : mode === "balanced" ? t("generator.modeBalancedDesc")
    : mode === "lowshare" ? t("generator.modeLowShareDesc")
    : t("generator.modeFormulaDesc");

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: t(game.nameKey), headerTintColor: game.color }} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 56, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {/* title + recipe */}
        <View style={[styles.gameHeader, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={[styles.gameOrb, { backgroundColor: game.color }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.gameName, { color: theme.text }]}>{t(game.nameKey)}</Text>
            <Text style={[styles.gameRule, { color: theme.subText }]}>{t(game.taglineKey)}</Text>
          </View>
          <Pressable
            onPress={() => router.push(`/stats/${game.id}`)}
            style={[styles.statsBtn, { borderColor: theme.border }]}
          >
            <Feather name="bar-chart-2" size={16} color={game.color} />
            <Text style={[styles.statsBtnText, { color: theme.text }]}>{t("generator.stats")}</Text>
          </Pressable>
        </View>

        {/* mode */}
        <Text style={[styles.label, { color: theme.text }]}>{t("generator.mode")}</Text>
        <Segmented options={modeOptions} value={mode} onChange={setMode} color={game.color} />
        <View style={styles.descRow}>
          {mode !== "random" && !isPremium && <Feather name="lock" size={11} color={theme.gold} style={{ marginRight: 5 }} />}
          <Text style={[styles.desc, { color: theme.subText }]}>{modeDesc}</Text>
        </View>

        {/* Hızlı On count */}
        {game.variableCount && (
          <View style={{ marginTop: 22 }}>
            <Text style={[styles.label, { color: theme.text }]}>{t("generator.count")}: {count}</Text>
            <View style={styles.counterRow}>
              {Array.from({ length: game.variableCount.max - game.variableCount.min + 1 }, (_, i) => game.variableCount!.min + i).map((n) => {
                const active = n === count;
                return (
                  <Pressable key={n} onPress={() => setCount(n)} style={[styles.countChip, { backgroundColor: active ? game.color : theme.card, borderColor: active ? game.color : theme.border }]}>
                    <Text style={{ color: active ? "#fff" : theme.text, fontFamily: fonts.ball, fontWeight: "800" }}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* rows */}
        <Text style={[styles.label, { color: theme.text, marginTop: 22 }]}>{t("generator.rowsTitle")}</Text>
        <Segmented
          options={[
            { value: "single", label: t("common.singleRow") },
            { value: "ten", label: t("common.tenRows") },
          ]}
          value={rowMode}
          onChange={(v) => setRowMode(v as RowMode)}
          color={game.color}
        />

        {/* results */}
        <View style={{ marginTop: 24 }}>
          {coupons.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: theme.border }]}>
              <View style={[styles.emptyOrb, { backgroundColor: game.color }]} />
              <Text style={[styles.empty, { color: theme.subText }]}>{t("generator.empty")}</Text>
            </View>
          ) : (
            coupons.map((c, i) => (
              <CouponRow key={c.uid} coupon={c} color={game.color} index={coupons.length > 1 ? i : undefined} onCopied={() => toast(t("common.copied"))} />
            ))
          )}
        </View>

        <Text style={[styles.independence, { color: theme.subText }]}>{t("disclaimer.independence")}</Text>
      </ScrollView>

      {/* sticky footer */}
      <LinearGradient
        colors={[`${theme.bg}00`, theme.bg, theme.bg]}
        style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}
      >
        <AdBanner />
        <PrimaryButton
          label={coupons.length ? t("common.regenerate") : t("common.generate")}
          onPress={generate}
          variant="game"
          color={game.color}
          icon={<Feather name="refresh-cw" size={18} color="#fff" />}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  gameHeader: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 20, padding: 15, marginBottom: 24 },
  statsBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  statsBtnText: { fontFamily: fonts.bodySemi, fontWeight: "700", fontSize: 12.5 },
  gameOrb: { width: 14, height: 44, borderRadius: 7 },
  gameName: { fontSize: 22, fontFamily: fonts.displayHeavy, fontWeight: "900", letterSpacing: -0.4 },
  gameRule: { fontSize: 13, fontFamily: fonts.body, marginTop: 3 },
  label: { fontSize: 13, fontFamily: fonts.bodyBold, fontWeight: "800", letterSpacing: 0.3, marginBottom: 11, textTransform: "uppercase", opacity: 0.9 },
  descRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  desc: { fontSize: 12, fontFamily: fonts.body, lineHeight: 17, flex: 1 },
  counterRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  countChip: { width: 44, height: 44, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  emptyBox: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 22, paddingVertical: 46, alignItems: "center", gap: 14 },
  emptyOrb: { width: 30, height: 30, borderRadius: 15, opacity: 0.5 },
  empty: { fontSize: 13.5, fontFamily: fonts.body },
  independence: { fontSize: 11, fontFamily: fonts.body, lineHeight: 16, marginTop: 14, textAlign: "center" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 24 },
});
