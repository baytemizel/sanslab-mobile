import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useApp } from "../state/AppContext";
import { fonts, palette, radius } from "../theme/colors";

interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: "gold" | "game" | "ghost";
  color?: string; // for "game" variant
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  /** Yazı rengini zorlar (varsayılan: varyantın kendi rengi). */
  labelColor?: string;
}

/** Birincil aksiyon. "gold" = altın gradyan (üret), "game" = oyun rengi gradyanı. */
export function PrimaryButton({
  label,
  onPress,
  variant = "gold",
  color,
  loading,
  disabled,
  icon,
  labelColor,
}: BtnProps) {
  const { theme } = useApp();

  if (variant === "ghost") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.btn,
          styles.ghost,
          { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Inner icon={icon} label={label} color={theme.text} />
      </Pressable>
    );
  }

  const grad =
    variant === "gold"
      ? [palette.goldBright, palette.gold, palette.goldDeep]
      : [shade(color ?? theme.goldFill, 1.18), color ?? theme.goldFill, shade(color ?? theme.goldFill, 0.84)];
  const onColor = labelColor ?? (variant === "gold" ? theme.onGold : "#fff");

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{ opacity: disabled ? 0.7 : pressed ? 0.9 : 1 }]}
    >
      <LinearGradient
        colors={grad as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        // Pasifken gölge yok: Android'de yarı saydam butonun arkasındaki
        // elevation gölgesi koyu bir blok olarak görünüyordu.
        style={[
          styles.btn,
          !disabled && styles.shadow,
          !disabled && variant === "gold" && styles.goldShadow,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={onColor} />
        ) : (
          <Inner icon={icon} label={label} color={onColor} />
        )}
      </LinearGradient>
    </Pressable>
  );
}

function Inner({ icon, label, color }: { icon?: React.ReactNode; label: string; color: string }) {
  return (
    <View style={styles.inner}>
      {icon}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

interface SegProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  color?: string;
  /** "chips": her seçenek ayrı kutu, aralarında boşluklu 2 sütunlu ızgara (uzun etiketler için). */
  variant?: "segmented" | "chips";
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  color,
  variant = "segmented",
}: SegProps<T>) {
  const { theme } = useApp();
  const active = color ?? theme.gold;
  const activeBg = theme.dark ? "rgba(255,255,255,0.10)" : "#fff";

  if (variant === "chips") {
    return (
      <View style={styles.chips}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[
                styles.chip,
                {
                  backgroundColor: on ? activeBg : theme.card,
                  borderColor: on ? active : theme.border,
                },
              ]}
            >
              <Text style={[styles.segLabel, { color: on ? active : theme.subText }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.seg, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={styles.segItem}>
            {on && (
              <View
                style={[
                  styles.segActive,
                  { backgroundColor: activeBg, borderColor: active },
                ]}
              />
            )}
            <Text style={[styles.segLabel, { color: on ? active : theme.subText }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** lighten (>1) / darken (<1) a hex color */
function shade(hex: string, factor: number): string {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(factor > 1 ? v + (255 - v) * (factor - 1) : v * factor)));
  return `#${[f(r), f(g), f(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const styles = StyleSheet.create({
  btn: {
    height: 58,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  ghost: { borderWidth: 1.5, backgroundColor: "transparent" },
  shadow: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  goldShadow: { shadowColor: palette.gold, shadowOpacity: 0.5, shadowRadius: 18 },
  inner: { flexDirection: "row", alignItems: "center", gap: 9 },
  label: { fontSize: 17, fontFamily: fonts.bodyBold, fontWeight: "800", letterSpacing: 0.2 },
  seg: {
    flexDirection: "row",
    borderRadius: radius.sm + 2,
    padding: 5,
    borderWidth: 1,
  },
  segItem: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segActive: { ...StyleSheet.absoluteFillObject, borderRadius: radius.sm, borderWidth: 1 },
  segLabel: { fontSize: 13.5, fontFamily: fonts.bodySemi, fontWeight: "700", textAlign: "center" },
  // 2 sütun: %48.5 + space-between ≈ 10px yatay boşluk; tek kalan öğe yarım genişlikte kalır.
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  chip: {
    width: "48.5%",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
