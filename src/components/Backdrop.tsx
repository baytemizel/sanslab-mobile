import React, { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Rect, Circle, Ellipse } from "react-native-svg";

import { useApp } from "../state/AppContext";
import { palette } from "../theme/colors";

/**
 * Gece Çekilişi arka planı: dikey gradyan + üst-merkez altın hâle (radial)
 * + gece ateşinden kopan kıvılcımlar. Tüm ekranların altında sabit durur.
 */

interface Spark {
  x: number; // doğduğu nokta
  y: number;
  r: number; // çekirdek yarıçapı
  o: number; // en parlak anındaki opaklık
  rise: number; // ömrü boyunca yükseldiği mesafe
  drift: number[]; // yatay sapma: ömrün 0, ¼, ½, ¾ ve sonunda
  spin: number; // ömrü boyunca dönüş (derece; işaret = yön)
  duration: number;
  delay: number; // yalnızca ilk çıkışta; döngüler arasında tekrar etmez
  tone: number;
}

const SPARK_COUNT = 40;
const LIFE = [0, 0.25, 0.5, 0.75, 1];

// Deterministic spark field (no re-randomizing on every render).
function makeSparks(width: number, height: number): Spark[] {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const out: Spark[] = [];
  for (let i = 0; i < SPARK_COUNT; i++) {
    const rise = height * (0.18 + rnd() * 0.32);
    // Genel eğilim (sola/sağa) + rüzgârda salınım: her kıvılcım kendi rotasında.
    const lean = (rnd() - 0.5) * 0.5 * rise;
    const sway = (8 + rnd() * 18) * (rnd() < 0.5 ? -1 : 1);
    out.push({
      x: rnd() * width,
      // Alt bölgede yoğun; bir kısmı ekranın altından doğup içeri yükselir.
      y: height * (0.2 + rnd() * 0.9),
      r: 0.8 + rnd() * 1.6,
      o: 0.35 + rnd() * 0.5,
      rise,
      drift: [0, lean * 0.25 + sway, lean * 0.5 - sway * 0.6, lean * 0.75 + sway * 0.4, lean],
      spin: (rnd() < 0.5 ? -1 : 1) * (120 + rnd() * 420),
      duration: 5000 + rnd() * 6000,
      delay: rnd() * 9000,
      tone: Math.floor(rnd() * 3),
    });
  }
  return out;
}

/** "Hareketi azalt" açıksa kıvılcımlar yerinde, sabit durur. null = henüz bilinmiyor. */
function useReduceMotion(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduce(v))
      .catch(() => alive && setReduce(false));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export default function Backdrop({ glow = true }: { glow?: boolean }) {
  const { theme } = useApp();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const sparks = useMemo(() => makeSparks(width, height), [width, height]);
  const progress = useMemo(() => sparks.map(() => new Animated.Value(0)), [sparks]);

  useEffect(() => {
    if (reduceMotion === null) return;
    if (reduceMotion) {
      progress.forEach((p) => p.setValue(0.3));
      return;
    }
    // Döngü tamamen native tarafta döner; JS yalnızca ilk gecikmeyi bekler.
    const loops = sparks.map((s, i) =>
      Animated.loop(
        Animated.timing(progress[i], {
          toValue: 1,
          duration: s.duration,
          delay: s.delay,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [sparks, progress, reduceMotion]);

  const tones = theme.dark
    ? [palette.goldBright, palette.gold, palette.goldDeep]
    : [palette.goldOnLight, palette.goldDeep, palette.goldOnLight];

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
      </Svg>
      {sparks.map((s, i) => {
        const p = progress[i];
        const color = tones[s.tone];
        const halo = s.r * 7;
        const peak = theme.dark ? s.o : s.o * 0.6;
        return (
          <Animated.View
            key={i}
            style={[
              styles.spark,
              {
                left: s.x - halo / 2,
                top: s.y - halo / 2,
                width: halo,
                height: halo,
                // Tutuşur, titreyerek söner.
                opacity: p.interpolate({
                  inputRange: [0, 0.08, 0.3, 0.4, 0.6, 1],
                  outputRange: [0, peak, peak * 0.6, peak, peak * 0.5, 0],
                }),
                transform: [
                  // Yükseldikçe yavaşlar.
                  { translateY: p.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -s.rise * 0.62, -s.rise] }) },
                  { translateX: p.interpolate({ inputRange: LIFE, outputRange: s.drift }) },
                  { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${s.spin}deg`] }) },
                  { scale: p.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0.85, 0.15] }) },
                ],
              },
            ]}
          >
            {/* Yumuşak ışıma + hafif uzun çekirdek: dönüşü görünür kılar. */}
            <Svg width={halo} height={halo}>
              <Defs>
                <RadialGradient id={`ember${i}`} cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={color} stopOpacity={theme.dark ? 0.55 : 0.25} />
                  <Stop offset="0.3" stopColor={color} stopOpacity={theme.dark ? 0.16 : 0.08} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill={`url(#ember${i})`} />
              <Ellipse cx={halo / 2} cy={halo / 2} rx={s.r} ry={s.r * 1.45} fill={color} />
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  spark: { position: "absolute" },
});
