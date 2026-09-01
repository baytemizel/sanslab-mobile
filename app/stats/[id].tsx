import React, { useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Svg, { Rect, Line } from "react-native-svg";

import { getGame } from "../../src/games/config";
import { drawUniform } from "../../src/games/generator";
import { computeFrequencies, simulateFairDraws, Draw } from "../../src/games/stats";
import Ball from "../../src/components/Ball";
import { useApp } from "../../src/state/AppContext";
import { fonts } from "../../src/theme/colors";

const SAMPLE_DRAWS = 1000;

export default function StatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const game = useMemo(() => getGame(String(id)), [id]);

  // Demo/örnek: adil çekilişleri yerel simüle et (gerçek sürümde resmi veri yüklenir).
  const [seed, setSeed] = useState(0);
  const draws: Draw[] = useMemo(() => {
    if (!game) return [];
    const mainPool = game.pools[0];
    return simulateFairDraws(SAMPLE_DRAWS, mainPool.min, mainPool.max, mainPool.count, drawUniform);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, seed]);

  const stats = useMemo(() => {
    if (!game) return null;
    const mp = game.pools[0];
    return computeFrequencies(draws, mp.min, mp.max, mp.count);
  }, [game, draws]);

  const resim = useCallback(() => setSeed((s) => s + 1), []);

  if (!game || !stats) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.text }}>—</Text>
      </View>
    );
  }

  const color = game.color;
  const maxCount = Math.max(...stats.buckets.map((b) => b.count), 1);
  const expected = (stats.totalDraws * game.pools[0].count) / stats.buckets.length;

  // chart geometry
  const barW = 9;
  const gap = 3;
  const chartH = 150;
  const chartW = stats.buckets.length * (barW + gap);
  const hotSet = new Set(stats.hot);
  const coldSet = new Set(stats.cold);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: t("statistics.title"), headerTintColor: color }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 56, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* header */}
        <View style={[styles.header, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <View style={[styles.bar, { backgroundColor: color }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>{t(game.nameKey)}</Text>
            <Text style={[styles.sub, { color: theme.subText }]}>
              {stats.totalDraws.toLocaleString()} {t("statistics.drawsLabel")} · {t("statistics.subtitle")}
            </Text>
          </View>
        </View>

        {/* disclaimer */}
        <View style={[styles.disc, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Feather name="alert-circle" size={15} color={theme.gold} />
          <Text style={[styles.discText, { color: theme.subText }]}>{t("statistics.disclaimer")}</Text>
        </View>

        {/* chart */}
        <Text style={[styles.label, { color: theme.subText }]}>1–{game.pools[0].max}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.chartWrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Svg width={chartW + 8} height={chartH + 4}>
            {/* expected (uniform) reference line */}
            <Line
              x1={0}
              y1={chartH - (expected / maxCount) * chartH}
              x2={chartW}
              y2={chartH - (expected / maxCount) * chartH}
              stroke={theme.gold}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
            {stats.buckets.map((b, i) => {
              const h = Math.max(2, (b.count / maxCount) * chartH);
              const isHot = hotSet.has(b.n);
              const isCold = coldSet.has(b.n);
              const fill = isHot ? color : isCold ? theme.subText : theme.dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.18)";
              return (
                <Rect key={b.n} x={i * (barW + gap)} y={chartH - h} width={barW} height={h} rx={2} fill={fill} opacity={isHot || isCold ? 1 : 0.9} />
              );
            })}
          </Svg>
        </ScrollView>
        <View style={styles.legendRow}>
          <View style={styles.legend}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={[styles.legendText, { color: theme.subText }]}>{t("statistics.hot")}</Text></View>
          <View style={styles.legend}><View style={[styles.dot, { backgroundColor: theme.subText }]} /><Text style={[styles.legendText, { color: theme.subText }]}>{t("statistics.cold")}</Text></View>
          <View style={styles.legend}><View style={[styles.dash, { backgroundColor: theme.gold }]} /><Text style={[styles.legendText, { color: theme.subText }]}>{t("statistics.expected")}</Text></View>
        </View>

        {/* hot / cold balls */}
        <Text style={[styles.label, { color: theme.subText, marginTop: 22 }]}>{t("statistics.hot")}</Text>
        <View style={styles.balls}>{stats.hot.map((n) => <Ball key={`h${n}`} value={n} color={color} size={42} />)}</View>
        <Text style={[styles.label, { color: theme.subText, marginTop: 16 }]}>{t("statistics.cold")}</Text>
        <View style={styles.balls}>{stats.cold.map((n) => <Ball key={`c${n}`} value={n} color={color} size={42} />)}</View>

        {/* fairness verdict */}
        <View style={[styles.verdict, { borderColor: stats.verdict === "fair" ? theme.gold : theme.border, backgroundColor: theme.card }]}>
          <View style={[styles.verdictIcon, { backgroundColor: theme.goldFill }]}>
            <Feather name={stats.verdict === "fair" ? "check" : "info"} size={18} color={theme.onGold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.verdictTitle, { color: theme.text }]}>
              {stats.verdict === "fair" ? t("statistics.fairTitle") : t("statistics.insufficientTitle")}
            </Text>
            <Text style={[styles.verdictBody, { color: theme.subText }]}>
              {stats.verdict === "fair" ? t("statistics.fairBody") : t("statistics.insufficientBody")}
            </Text>
          </View>
        </View>

        <Pressable onPress={resim} style={[styles.resim, { borderColor: theme.border }]}>
          <Feather name="refresh-cw" size={15} color={theme.gold} />
          <Text style={[styles.resimText, { color: theme.text }]}>{t("statistics.simulate")}</Text>
        </Pressable>

        <Text style={[styles.sampleNote, { color: theme.subText }]}>{t("statistics.sampleNote")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 20, padding: 15, marginBottom: 16 },
  bar: { width: 14, height: 44, borderRadius: 7 },
  title: { fontSize: 20, fontFamily: fonts.displayHeavy, fontWeight: "900", letterSpacing: -0.3 },
  sub: { fontSize: 12.5, fontFamily: fonts.body, marginTop: 3 },
  disc: { flexDirection: "row", gap: 9, alignItems: "flex-start", borderWidth: 1, borderRadius: 16, padding: 13, marginBottom: 22 },
  discText: { flex: 1, fontSize: 12, fontFamily: fonts.body, lineHeight: 17 },
  label: { fontSize: 12, fontFamily: fonts.bodyBold, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  chartWrap: { borderWidth: 1, borderRadius: 18, padding: 12 },
  legendRow: { flexDirection: "row", gap: 18, marginTop: 12 },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dash: { width: 14, height: 3, borderRadius: 2 },
  legendText: { fontSize: 11.5, fontFamily: fonts.body },
  balls: { flexDirection: "row", flexWrap: "wrap" },
  verdict: { flexDirection: "row", gap: 13, alignItems: "flex-start", borderWidth: 1.5, borderRadius: 20, padding: 16, marginTop: 24 },
  verdictIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  verdictTitle: { fontSize: 16, fontFamily: fonts.display, fontWeight: "800" },
  verdictBody: { fontSize: 13, fontFamily: fonts.body, lineHeight: 19, marginTop: 4 },
  resim: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 14, paddingVertical: 13, marginTop: 16 },
  resimText: { fontSize: 14, fontFamily: fonts.bodySemi, fontWeight: "700" },
  sampleNote: { fontSize: 11, fontFamily: fonts.body, lineHeight: 16, textAlign: "center", marginTop: 14 },
});
