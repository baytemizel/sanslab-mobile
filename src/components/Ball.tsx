import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle } from "react-native-svg";

import { useApp } from "../state/AppContext";
import { fonts } from "../theme/colors";

interface Props {
  value: number;
  color: string;
  special?: boolean;
  size?: number;
  /** Komşu toplarla arasındaki boşluk (sağ ve alt). */
  gap?: number;
}

/**
 * İmza öğesi: parlayan çekiliş topu.
 * Sol-üstten ışık alan, renkli halkalı, koyu zeminde hafif hâle bırakan küre.
 * special=true (Joker/Şans Topu) -> dolu renkli, daha güçlü ışıma.
 */
export default function Ball({ value, color, special, size = 46, gap = 9 }: Props) {
  const { theme } = useApp();
  const id = `${color}-${special ? "s" : "m"}`.replace(/[^a-zA-Z0-9]/g, "");
  const face = special ? color : theme.ballFace;
  const digit = special ? "#fff" : theme.dark ? color : color;
  const glow = theme.ballGlow;

  return (
    <View style={[styles.wrap, { width: size, height: size, marginRight: gap, marginBottom: gap }]}>
      {/* outer glow */}
      {glow > 0 && (
        <View
          style={[
            styles.glow,
            {
              width: size * 1.5,
              height: size * 1.5,
              borderRadius: size,
              backgroundColor: color,
              opacity: (special ? 0.5 : 0.32) * glow,
            },
          ]}
        />
      )}
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`hl${id}`} cx="34%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={special ? 0.55 : theme.dark ? 0.22 : 0.9} />
            <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity={special ? 0.12 : 0.04} />
            <Stop offset="1" stopColor="#000000" stopOpacity={special ? 0.18 : 0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} fill={face} stroke={color} strokeWidth={special ? 0 : 1.5} />
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} fill={`url(#hl${id})`} />
      </Svg>
      <Text style={[styles.digit, { color: digit, fontSize: size * 0.4 }]}>
        {String(value).padStart(2, "0")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
  digit: { position: "absolute", fontFamily: fonts.ball, fontWeight: "800", letterSpacing: 0.5 },
});
