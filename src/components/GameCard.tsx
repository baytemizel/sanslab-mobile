import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

import { GameDef } from "../games/config";
import { useApp } from "../state/AppContext";
import { fonts } from "../theme/colors";

interface Props {
  game: GameDef;
  onPress: () => void;
}

/** Oyun kartı: parlayan renk küresi + isim + kural özeti. */
export default function GameCard({ game, onPress }: Props) {
  const { t } = useTranslation();
  const { theme } = useApp();
  const gid = game.id;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t(game.nameKey)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {/* glowing orb */}
      <View style={styles.orbWrap}>
        <View style={[styles.orbGlow, { backgroundColor: game.color }]} />
        <Svg width={46} height={46}>
          <Defs>
            <RadialGradient id={`orb${gid}`} cx="34%" cy="30%" r="80%">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.85} />
              <Stop offset="0.4" stopColor={game.color} stopOpacity={1} />
              <Stop offset="1" stopColor={game.color} stopOpacity={1} />
            </RadialGradient>
          </Defs>
          <Circle cx={23} cy={23} r={21} fill={`url(#orb${gid})`} />
        </Svg>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {t(game.nameKey)}
          </Text>
        </View>
        <Text style={[styles.tagline, { color: theme.subText }]} numberOfLines={1}>
          {t(game.taglineKey)}
        </Text>
      </View>

      <Feather name="chevron-right" size={20} color={theme.gold} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginBottom: 13,
  },
  orbWrap: { width: 46, height: 46, alignItems: "center", justifyContent: "center", marginRight: 15 },
  orbGlow: { position: "absolute", width: 60, height: 60, borderRadius: 30, opacity: 0.35 },
  body: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { fontSize: 18, fontFamily: fonts.display, fontWeight: "800", letterSpacing: -0.2 },
  tagline: { fontSize: 12.5, fontFamily: fonts.body, marginTop: 3 },
});
