import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import { useApp } from "../state/AppContext";
import { fonts } from "../theme/colors";

interface Props {
  title?: string;
  /** Geri ikonunun rengi (oyun ekranlarında oyun rengi). */
  tint?: string;
}

/**
 * İçerikle birlikte kayan başlık (geri butonu + başlık). Native header'ı
 * gizlenen ekranlarda ScrollView'un ilk çocuğu olarak kullanılır; böylece
 * kaydırınca header da yukarı kayar, içerik sabit butonun altından akmaz.
 */
export default function ScreenHeader({ title, tint }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useApp();

  // Deep link ile doğrudan açıldıysa geri gidilecek ekran yok → ana ekran.
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        style={({ pressed }) => [
          styles.backBtn,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Feather name="chevron-left" size={22} color={tint ?? theme.gold} />
      </Pressable>
      {!!title && (
        <Text
          numberOfLines={1}
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
        >
          {title}
        </Text>
      )}
      {/* başlığı ortalamak için geri butonuyla eş genişlikte boşluk */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: fonts.display,
    fontWeight: "700",
  },
  spacer: { width: 42 },
});
