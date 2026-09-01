import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Field from "../../src/components/Field";
import { PrimaryButton } from "../../src/components/Buttons";
import { useApp } from "../../src/state/AppContext";
import {
  isAuthAvailable,
  signUpWithEmail,
  type AuthErrorCode,
} from "../../src/services/auth";
import { logEvent } from "../../src/services/firebase";
import { links } from "../../src/services/env";
import { fonts } from "../../src/theme/colors";

const MIN_PASSWORD = 6;

export default function SignUp() {
  const { t } = useTranslation();
  const { theme } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | "terms" | "weak" | null>(
    null
  );

  const available = isAuthAvailable();

  const submit = useCallback(async () => {
    setError(null);
    if (!accepted) {
      setError("terms");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError("weak");
      return;
    }
    setBusy(true);
    const res = await signUpWithEmail(email, password, name);
    setBusy(false);
    if (res.user) {
      logEvent("sign_up", { method: "password" });
      router.back();
    } else {
      setError(res.error ?? "unknown");
    }
  }, [accepted, email, password, name, router]);

  const errorText =
    error === "terms"
      ? t("auth.error.terms")
      : error === "weak"
      ? t("auth.error.weak-password")
      : error
      ? t(`auth.error.${error}`)
      : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          style={[
            styles.closeBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Feather name="x" size={20} color={theme.text} />
        </Pressable>

        <Text style={[styles.title, { color: theme.text }]}>
          {t("auth.signUpTitle")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          {t("auth.signUpSubtitle")}
        </Text>

        {!available ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Feather name="info" size={16} color={theme.gold} />
            <Text style={[styles.noticeText, { color: theme.subText }]}>
              {t("auth.unavailable")}
            </Text>
          </View>
        ) : (
          <>
            <Field
              label={t("auth.name")}
              icon="user"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              placeholder={t("auth.namePlaceholder")}
            />
            <Field
              label={t("auth.email")}
              icon="mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              textContentType="emailAddress"
            />
            <Field
              label={t("auth.password")}
              icon="lock"
              value={password}
              onChangeText={setPassword}
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder={t("auth.passwordHint", { n: MIN_PASSWORD })}
            />

            <Pressable
              onPress={() => setAccepted((a) => !a)}
              style={styles.termsRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepted }}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: accepted ? theme.goldFill : theme.border,
                    backgroundColor: accepted ? theme.goldFill : "transparent",
                  },
                ]}
              >
                {accepted && <Feather name="check" size={13} color={theme.onGold} />}
              </View>
              <Text style={[styles.termsText, { color: theme.subText }]}>
                {t("auth.acceptPrefix")}{" "}
                <Text
                  style={{ color: theme.gold }}
                  onPress={() => Linking.openURL(links.terms)}
                >
                  {t("settings.terms")}
                </Text>
                {" · "}
                <Text
                  style={{ color: theme.gold }}
                  onPress={() => Linking.openURL(links.privacy)}
                >
                  {t("settings.privacy")}
                </Text>
              </Text>
            </Pressable>

            {errorText && <Text style={styles.error}>{errorText}</Text>}

            <PrimaryButton
              label={t("auth.signUp")}
              onPress={submit}
              loading={busy}
              variant="gold"
            />

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: theme.subText }]}>
                {t("auth.haveAccount")}
              </Text>
              <Pressable onPress={() => router.replace("/(auth)/sign-in")} hitSlop={8}>
                <Text style={[styles.link, { color: theme.gold }]}>
                  {t("auth.signIn")}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        <Pressable onPress={() => router.back()} style={styles.guest}>
          <Text style={[styles.guestText, { color: theme.subText }]}>
            {t("auth.continueAsGuest")}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.displayHeavy,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14.5,
    fontFamily: fonts.body,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 26,
  },
  notice: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: fonts.body, lineHeight: 19 },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginTop: 4,
    marginBottom: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  termsText: { flex: 1, fontSize: 13, fontFamily: fonts.body, lineHeight: 19 },
  error: {
    color: "#F5333B",
    fontSize: 13,
    fontFamily: fonts.bodyMed,
    marginBottom: 12,
    textAlign: "center",
  },
  link: { fontSize: 13.5, fontFamily: fonts.bodySemi, fontWeight: "700" },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 22,
  },
  footerText: { fontSize: 13.5, fontFamily: fonts.body },
  guest: { alignItems: "center", paddingVertical: 20 },
  guestText: {
    fontSize: 13.5,
    fontFamily: fonts.bodySemi,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
