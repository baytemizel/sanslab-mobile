import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";

import { useApp } from "../state/AppContext";
import { fonts } from "../theme/colors";

export type SocialProvider = "apple" | "google" | "facebook";

interface Props {
  provider: SocialProvider;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

interface Look {
  bg: string;
  fg: string;
  border: string;
}

/**
 * Sağlayıcıların marka kurallarına uyan renkler:
 *  • Apple (HIG): açık zeminde siyah, koyu zeminde beyaz buton.
 *  • Google: resmi açık/koyu tema dolgu + kenar renkleri, renkli "G".
 *  • Facebook: marka mavisi, beyaz logo.
 */
function lookFor(provider: SocialProvider, dark: boolean): Look {
  switch (provider) {
    case "apple":
      return dark
        ? { bg: "#FFFFFF", fg: "#000000", border: "#FFFFFF" }
        : { bg: "#000000", fg: "#FFFFFF", border: "#000000" };
    case "google":
      return dark
        ? { bg: "#131314", fg: "#E3E3E3", border: "#8E918F" }
        : { bg: "#FFFFFF", fg: "#1F1F1F", border: "#747775" };
    case "facebook":
      return { bg: "#1877F2", fg: "#FFFFFF", border: "#1877F2" };
  }
}

/** Tam genişlikte sosyal giriş butonu (her satırda bir tane). */
export default function SocialButton({
  provider,
  label,
  onPress,
  loading,
  disabled,
}: Props) {
  const { theme } = useApp();
  const look = lookFor(provider, theme.dark);
  const inactive = Boolean(disabled || loading);

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: look.bg,
          borderColor: look.border,
          opacity: disabled && !loading ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.icon}>
        {loading ? (
          <ActivityIndicator size="small" color={look.fg} />
        ) : provider === "google" ? (
          <GoogleLogo size={18} />
        ) : (
          <Ionicons
            name={provider === "apple" ? "logo-apple" : "logo-facebook"}
            size={20}
            color={look.fg}
          />
        )}
      </View>
      <Text style={[styles.label, { color: look.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** Google'ın renkli "G" logosu (marka kuralı gereği tek renk kullanılamaz). */
function GoogleLogo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 18,
  },
  icon: { width: 22, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15.5, fontFamily: fonts.bodySemi, fontWeight: "700" },
});
