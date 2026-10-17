import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";

import BottomSheet from "./BottomSheet";
import SocialSignInButtons from "./SocialSignInButtons";
import { useApp } from "../state/AppContext";
import type { AuthUser } from "../services/auth";
import { fonts } from "../theme/colors";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSignedIn: (user: AuthUser) => void | Promise<void>;
}

/**
 * Satın almadan önce giriş isteyen alt sayfa: Premium hesaba bağlanır,
 * böylece cihaz değişse ya da uygulama silinse de kaybolmaz.
 */
export default function SignInSheet({ visible, onClose, onSignedIn }: Props) {
  const { t } = useTranslation();
  const { theme } = useApp();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.icon, { backgroundColor: theme.goldFill }]}>
        <Feather name="user" size={24} color={theme.onGold} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>
        {t("premium.signInTitle")}
      </Text>
      <Text style={[styles.body, { color: theme.subText }]}>
        {t("premium.signInBody")}
      </Text>
      <SocialSignInButtons onSignedIn={onSignedIn} />
      <Pressable onPress={onClose} accessibilityRole="button" style={styles.cancel}>
        <Text style={[styles.cancelText, { color: theme.subText }]}>
          {t("common.cancel")}
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.displayHeavy,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    fontFamily: fonts.body,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 22,
  },
  cancel: { alignItems: "center", paddingTop: 16 },
  cancelText: { fontSize: 14, fontFamily: fonts.bodySemi, fontWeight: "700" },
});
