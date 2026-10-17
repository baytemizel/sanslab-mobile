import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextStyle,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
  ToastAndroid,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { Segmented, PrimaryButton } from "../src/components/Buttons";
import BottomSheet from "../src/components/BottomSheet";
import ScreenHeader from "../src/components/ScreenHeader";
import { useApp } from "../src/state/AppContext";
import type { Lang } from "../src/i18n";
import { hasPremium, restore } from "../src/services/revenuecat";
import { isAuthAvailable } from "../src/services/auth";
import { appVersion, links } from "../src/services/env";
import { fonts } from "../src/theme/colors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

export default function Settings() {
  const { t } = useTranslation();
  const {
    theme,
    themePref,
    setThemePref,
    lang,
    setLang,
    refreshPremium,
    isPremium,
    user,
    history,
  } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const toast = useCallback((msg: string) => {
    if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  }, []);

  const doRestore = useCallback(async () => {
    setBusy(true);
    const info = await restore();
    setBusy(false);
    if (info && hasPremium(info)) {
      await refreshPremium();
      toast(t("premium.restored"));
    } else {
      toast(t("premium.restoreNone"));
    }
  }, [refreshPremium, toast, t]);

  const Row = ({
    icon,
    label,
    right,
    onPress,
    danger,
    labelStyle,
    gold,
  }: {
    icon: FeatherName;
    label: string;
    right?: React.ReactNode;
    onPress?: () => void;
    danger?: boolean;
    labelStyle?: TextStyle;
    /** Yıldız sarısı zeminli vurgulu satır (Premium). */
    gold?: boolean;
  }) => {
    const fg = danger ? "#F5333B" : undefined;
    // Yıldız kutusunun sarısı, aynı saydamlıkla.
    const goldTint = theme.dark ? "rgba(244,192,74,0.12)" : "#FFF6E2";
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        style={[
          styles.row,
          gold
            ? { backgroundColor: goldTint, borderColor: "rgba(244,192,74,0.28)" }
            : { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View
          style={[
            styles.rowIcon,
            {
              backgroundColor: gold
                ? theme.dark
                  ? "rgba(244,192,74,0.2)"
                  : "#FCEBC4"
                : goldTint,
            },
          ]}
        >
          <Feather name={icon} size={16} color={fg ?? theme.gold} />
        </View>
        <Text style={[styles.rowLabel, labelStyle, { color: fg ?? theme.text }]}>
          {label}
        </Text>
        <View style={{ flex: 1 }} />
        {right ??
          (onPress ? (
            <Feather name="chevron-right" size={18} color={fg ?? theme.subText} />
          ) : null)}
      </Pressable>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 44,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* içerikle birlikte kayan header */}
      <ScreenHeader title={t("common.settings")} />

      {/* hesap */}
      <Text style={[styles.section, { color: theme.subText }]}>
        {t("account.title")}
      </Text>
      <View style={{ gap: 11 }}>
        <Row
          icon={user ? "user-check" : "user"}
          label={user?.displayName ?? user?.email ?? t("account.guestTitle")}
          onPress={() =>
            user || !isAuthAvailable()
              ? router.push("/account")
              : router.push("/(auth)/sign-in")
          }
          right={
            <Text style={[styles.rowValue, { color: theme.subText }]}>
              {user ? t("account.manage") : t("auth.signIn")}
            </Text>
          }
        />
        <Row
          icon="clock"
          label={t("history.title")}
          onPress={() => router.push("/history")}
          right={
            <Text style={[styles.rowValue, { color: theme.subText }]}>
              {history.length}
            </Text>
          }
        />
        {!isPremium && (
          <Row
            icon="star"
            label={t("premium.title")}
            labelStyle={styles.premiumLabel}
            gold
            onPress={() => router.push("/paywall")}
          />
        )}
      </View>

      {/* dil */}
      <Text style={[styles.section, { color: theme.subText, marginTop: 26 }]}>
        {t("settings.language")}
      </Text>
      <Segmented
        options={[
          { value: "tr", label: "Türkçe" },
          { value: "en", label: "English" },
        ]}
        value={lang}
        onChange={(v) => setLang(v as Lang)}
      />

      {/* tema */}
      <Text style={[styles.section, { color: theme.subText, marginTop: 26 }]}>
        {t("settings.theme")}
      </Text>
      <Segmented
        options={[
          { value: "system", label: t("settings.themeSystem") },
          { value: "light", label: t("settings.themeLight") },
          { value: "dark", label: t("settings.themeDark") },
        ]}
        value={themePref}
        onChange={setThemePref}
      />

      {/* hakkında */}
      <Text style={[styles.section, { color: theme.subText, marginTop: 26 }]}>
        {t("settings.about")}
      </Text>
      <View style={{ gap: 11 }}>
        <Row
          icon="shield"
          label={t("settings.responsible")}
          onPress={() => setResponsibleOpen(true)}
        />
        <Row
          icon="lock"
          label={t("settings.privacy")}
          onPress={() => Linking.openURL(links.privacy)}
        />
        <Row
          icon="file-text"
          label={t("settings.terms")}
          onPress={() => Linking.openURL(links.terms)}
        />
        <Row
          icon="mail"
          label={t("settings.support")}
          onPress={() => Linking.openURL(links.support)}
        />
        {!isPremium && (
          <Row
            icon="refresh-ccw"
            label={busy ? t("settings.restoring") : t("settings.restore")}
            onPress={busy ? undefined : doRestore}
          />
        )}
        <Row
          icon="info"
          label={t("settings.version")}
          right={
            <Text style={[styles.rowValue, { color: theme.subText }]}>
              {appVersion}
            </Text>
          }
        />
      </View>

      <BottomSheet
        visible={responsibleOpen}
        onClose={() => setResponsibleOpen(false)}
      >
        <View style={[styles.modalIcon, { backgroundColor: theme.goldFill }]}>
          <Feather name="shield" size={24} color={theme.onGold} />
        </View>
        <Text style={[styles.modalTitle, { color: theme.text }]}>
          {t("disclaimer.responsibleTitle")}
        </Text>
        <Text style={[styles.modalBody, { color: theme.subText }]}>
          {t("disclaimer.responsibleBody")}
        </Text>
        <PrimaryButton
          label={t("common.close")}
          onPress={() => setResponsibleOpen(false)}
          variant="gold"
        />
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontFamily: fonts.bodyMed, fontWeight: "600" },
  // "Premium" markası: serif italik; ağırlığı font dosyası taşır.
  premiumLabel: { fontFamily: fonts.premium, fontWeight: "normal", fontSize: 17 },
  rowValue: { fontSize: 13.5, fontFamily: fonts.body },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: fonts.displayHeavy,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 14,
    fontFamily: fonts.body,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 22,
  },
});
