import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ToastAndroid,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import CouponRow from "../src/components/CouponRow";
import { PrimaryButton } from "../src/components/Buttons";
import { GAMES, getGame } from "../src/games/config";
import { couponToText } from "../src/games/generator";
import { useApp } from "../src/state/AppContext";
import { filterHistory } from "../src/state/history";
import {
  canExportHistory,
  FREE_FAVORITE_LIMIT,
  FREE_HISTORY_LIMIT,
  historyLimit,
} from "../src/premium/gates";
import { logEvent } from "../src/services/firebase";
import { fonts } from "../src/theme/colors";

type Filter = "all" | "favorites" | string;

export default function History() {
  const { t } = useTranslation();
  const {
    theme,
    isPremium,
    history,
    favoriteCount,
    toggleFavorite,
    removeCoupon,
    clearAllHistory,
  } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<Filter>("all");

  const toast = useCallback((msg: string) => {
    if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  }, []);

  const shown = useMemo(
    () =>
      filterHistory(history, {
        favoritesOnly: filter === "favorites",
        gameId: filter !== "all" && filter !== "favorites" ? filter : undefined,
      }),
    [history, filter]
  );

  const onFavorite = useCallback(
    (uid: string) => {
      const ok = toggleFavorite(uid);
      if (!ok) {
        toast(t("history.favoriteLimit", { n: FREE_FAVORITE_LIMIT }));
        router.push("/paywall");
      }
    },
    [toggleFavorite, toast, t, router]
  );

  /** Premium faydası: geçmişin tamamını tek dokunuşla panoya aktar. */
  const exportAll = useCallback(async () => {
    if (!canExportHistory({ isPremium })) {
      toast(t("premium.unlockExport"));
      logEvent("paywall_open", { reason: "history_export" });
      router.push("/paywall");
      return;
    }
    const text = shown
      .map((c) => {
        const g = getGame(c.gameId);
        const name = g ? t(g.nameKey) : c.gameId;
        return `${name}: ${couponToText(c)}`;
      })
      .join("\n");
    await Clipboard.setStringAsync(text);
    toast(t("history.exported", { n: shown.length }));
    logEvent("history_export", { rows: shown.length });
  }, [isPremium, shown, toast, t, router]);

  const chips: { value: Filter; label: string }[] = [
    { value: "all", label: t("history.filterAll") },
    { value: "favorites", label: `★ ${t("history.filterFavorites")}` },
    ...GAMES.filter((g) => history.some((c) => c.gameId === g.id)).map((g) => ({
      value: g.id as Filter,
      label: t(g.nameKey),
    })),
  ];

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: t("history.title") }} />
      <ScrollView
        contentContainerStyle={[
          {
            paddingHorizontal: 20,
            paddingTop: insets.top + 56,
            paddingBottom: insets.bottom + 40,
          },
          // Boş durum bloğu ekranın dikey ortasında dursun: alt boşluk üsttekine eşit.
          history.length === 0 && {
            flexGrow: 1,
            justifyContent: "center",
            paddingBottom: insets.top + 56,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {history.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.goldFill }]}>
              <Feather name="clock" size={24} color={theme.onGold} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {t("history.emptyTitle")}
            </Text>
            <Text style={[styles.emptyBody, { color: theme.subText }]}>
              {t("history.emptyBody")}
            </Text>
            <PrimaryButton
              label={t("history.goGenerate")}
              onPress={() => router.replace("/")}
              variant="gold"
            />
          </View>
        ) : (
          <>
            {/* kota bilgisi */}
            <View
              style={[
                styles.quota,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Feather
                name={isPremium ? "star" : "info"}
                size={14}
                color={theme.gold}
              />
              <Text style={[styles.quotaText, { color: theme.subText }]}>
                {isPremium
                  ? t("history.quotaPremium", { n: historyLimit({ isPremium }) })
                  : t("history.quotaFree", {
                      n: FREE_HISTORY_LIMIT,
                      f: FREE_FAVORITE_LIMIT,
                    })}
              </Text>
              {!isPremium && (
                <Pressable onPress={() => router.push("/paywall")} hitSlop={8}>
                  <Text style={[styles.quotaCta, { color: theme.gold }]}>
                    {t("common.premium")}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* filtreler */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {chips.map((c) => {
                const active = filter === c.value;
                return (
                  <Pressable
                    key={String(c.value)}
                    onPress={() => setFilter(c.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.goldFill : theme.card,
                        borderColor: active ? theme.goldFill : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? theme.onGold : theme.text },
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.count, { color: theme.subText }]}>
              {t("history.count", { n: shown.length, f: favoriteCount })}
            </Text>

            {shown.map((c) => {
              const game = getGame(c.gameId);
              return (
                <CouponRow
                  key={c.uid}
                  coupon={c}
                  color={game?.color ?? theme.gold}
                  subtitle={game ? t(game.nameKey) : c.gameId}
                  favorite={c.favorite}
                  onToggleFavorite={() => onFavorite(c.uid)}
                  onDelete={() => removeCoupon(c.uid)}
                  onCopied={() => toast(t("common.copied"))}
                />
              );
            })}

            {shown.length === 0 && (
              <Text style={[styles.noMatch, { color: theme.subText }]}>
                {t("history.noMatch")}
              </Text>
            )}

            <View style={styles.bottomActions}>
              <Pressable
                onPress={exportAll}
                disabled={shown.length === 0}
                style={[
                  styles.clear,
                  { borderColor: theme.border, opacity: shown.length ? 1 : 0.5 },
                ]}
              >
                <Feather
                  name={canExportHistory({ isPremium }) ? "share" : "lock"}
                  size={15}
                  color={theme.gold}
                />
                <Text style={[styles.clearText, { color: theme.text }]}>
                  {t("history.export")}
                </Text>
              </Pressable>

              <Pressable
                onPress={clearAllHistory}
                style={[styles.clear, { borderColor: theme.border }]}
              >
                <Feather name="trash-2" size={15} color={theme.subText} />
                <Text style={[styles.clearText, { color: theme.subText }]}>
                  {t("history.clearAll")}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  quota: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginBottom: 16,
  },
  quotaText: { flex: 1, fontSize: 12, fontFamily: fonts.body, lineHeight: 17 },
  quotaCta: { fontSize: 12.5, fontFamily: fonts.bodyBold, fontWeight: "800" },
  chips: { gap: 8, paddingBottom: 4 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 12.5, fontFamily: fonts.bodySemi, fontWeight: "700" },
  count: {
    fontSize: 11.5,
    fontFamily: fonts.bodyBold,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 12,
  },
  noMatch: {
    fontSize: 13.5,
    fontFamily: fonts.body,
    textAlign: "center",
    paddingVertical: 30,
  },
  bottomActions: { flexDirection: "row", gap: 10, marginTop: 10 },
  clear: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 13,
  },
  clearText: { fontSize: 13.5, fontFamily: fonts.bodySemi, fontWeight: "700" },
  empty: {
    padding: 30,
    alignItems: "center",
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontFamily: fonts.displayHeavy,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 13.5,
    fontFamily: fonts.body,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
});
