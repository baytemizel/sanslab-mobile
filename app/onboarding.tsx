import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Ball from "../src/components/Ball";
import { PrimaryButton } from "../src/components/Buttons";
import { useApp } from "../src/state/AppContext";
import { logEvent } from "../src/services/firebase";
import { fonts, gameColors } from "../src/theme/colors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

interface Slide {
  key: string;
  icon: FeatherName;
  titleKey: string;
  bodyKey: string;
  balls?: { n: number; c: string }[];
}

const SLIDES: Slide[] = [
  {
    key: "welcome",
    icon: "zap",
    titleKey: "onboarding.s1Title",
    bodyKey: "onboarding.s1Body",
    balls: [
      { n: 7, c: gameColors.sayisal },
      { n: 23, c: gameColors.super },
      { n: 34, c: gameColors.sans },
      { n: 11, c: gameColors.on },
      { n: 49, c: gameColors.hizli },
    ],
  },
  {
    key: "modes",
    icon: "sliders",
    titleKey: "onboarding.s2Title",
    bodyKey: "onboarding.s2Body",
  },
  {
    key: "honesty",
    icon: "shield",
    titleKey: "onboarding.s3Title",
    bodyKey: "onboarding.s3Body",
  },
  {
    key: "legal",
    icon: "alert-circle",
    titleKey: "onboarding.s4Title",
    bodyKey: "onboarding.s4Body",
  },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const { theme, completeOnboarding } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();

  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const last = index === SLIDES.length - 1;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      if (next !== index) setIndex(next);
    },
    [index, width]
  );

  const goTo = useCallback(
    (i: number) => {
      scrollRef.current?.scrollTo({ x: i * width, animated: true });
      setIndex(i);
    },
    [width]
  );

  const finish = useCallback(async () => {
    logEvent("onboarding_complete", { slides: SLIDES.length });
    await completeOnboarding();
    router.replace("/");
  }, [completeOnboarding, router]);

  const skip = useCallback(() => goTo(SLIDES.length - 1), [goTo]);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* atla */}
      <View style={styles.topBar}>
        {!last ? (
          <Pressable onPress={skip} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.skip, { color: theme.subText }]}>
              {t("onboarding.skip")}
            </Text>
          </Pressable>
        ) : (
          <View style={{ height: 20 }} />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={styles.flex}
      >
        {SLIDES.map((s) => (
          <View key={s.key} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: theme.goldFill }]}>
              <Feather name={s.icon} size={32} color={theme.onGold} />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              {t(s.titleKey)}
            </Text>
            <Text style={[styles.body, { color: theme.subText }]}>
              {t(s.bodyKey)}
            </Text>

            {s.balls && (
              <View style={styles.balls}>
                {s.balls.map((b) => (
                  <Ball key={b.n} value={b.n} color={b.c} size={44} />
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* noktalar */}
      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? theme.goldFill : theme.border,
                width: i === index ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <PrimaryButton
          label={last ? t("onboarding.accept") : t("common.continue")}
          onPress={last ? finish : () => goTo(index + 1)}
          variant="gold"
        />
        {last && (
          <Text style={[styles.legal, { color: theme.subText }]}>
            {t("onboarding.acceptNote")}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    height: 44,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 22,
  },
  skip: { fontSize: 14, fontFamily: fonts.bodySemi, fontWeight: "700" },
  slide: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconWrap: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 27,
    fontFamily: fonts.displayHeavy,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.6,
    lineHeight: 33,
  },
  body: {
    fontSize: 15,
    fontFamily: fonts.body,
    textAlign: "center",
    lineHeight: 23,
    marginTop: 14,
    maxWidth: 330,
  },
  balls: { flexDirection: "row", marginTop: 26 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginBottom: 22,
  },
  dot: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 24 },
  legal: {
    fontSize: 11,
    fontFamily: fonts.body,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 14,
  },
});
