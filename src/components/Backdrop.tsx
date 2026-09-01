import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Rect, Circle } from "react-native-svg";

import { useApp } from "../state/AppContext";

/**
 * Gece Çekilişi arka planı: dikey gradyan + üst-merkez altın hâle (radial)
 * + ince yıldız/serpinti alanı. Tüm ekranların altında sabit durur.
 */
export default function Backdrop({ glow = true }: { glow?: boolean }) {
  const { theme } = useApp();
  const { width, height } = useWindowDimensions();

  // Deterministic sparkle field (no re-randomizing on every render).
  const stars = useMemo(() => {
    const out: { x: number; y: number; r: number; o: number }[] = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const n = 46;
    for (let i = 0; i < n; i++) {
      out.push({
        x: rnd() * width,
        y: rnd() * height,
        r: 0.6 + rnd() * 1.8,
        o: 0.15 + rnd() * 0.5,
      });
    }
    return out;
  }, [width, height]);

  const starColor = theme.dark ? "#FFFFFF" : "#C8902B";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[theme.gradTop, theme.gradBottom]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="14%" r="62%">
            <Stop offset="0" stopColor={theme.gold} stopOpacity={glow ? (theme.dark ? 0.22 : 0.28) : 0} />
            <Stop offset="0.55" stopColor={theme.gold} stopOpacity={0.04} />
            <Stop offset="1" stopColor={theme.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#glow)" />
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={starColor} opacity={theme.dark ? s.o : s.o * 0.5} />
        ))}
      </Svg>
    </View>
  );
}
