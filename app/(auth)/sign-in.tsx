import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Field from "../../src/components/Field";
import { PrimaryButton } from "../../src/components/Buttons";
import { useApp } from "../../src/state/AppContext";
import {
  isAppleAuthAvailable,
  isAuthAvailable,
  isGoogleAuthAvailable,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  type AuthErrorCode,
} from "../../src/services/auth";
import { logEvent } from "../../src/services/firebase";
import { fonts } from "../../src/theme/colors";

export default function SignIn() {
  const { t } = useTranslation();
  const { theme } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google" | "apple">(null);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const available = isAuthAvailable();

  const done = useCallback(
    (method: string) => {
      logEvent("login", { method });
      router.back();
    },
    [router]
  );

  const submit = useCallback(async () => {
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError("invalid-email");
      return;
    }
    setBusy("email");
    const res = await signInWithEmail(email, password);
    setBusy(null);
    if (res.user) done("password");
    else setError(res.error ?? "unknown");
  }, [email, password, done]);

  const google = useCallback(async () => {
    setError(null);
    setBusy("google");
    const res = await signInWithGoogle();
    setBusy(null);
    if (res.user) done("google");
    else if (res.error && res.error !== "cancelled") setError(res.error);
  }, [done]);

  const apple = useCallback(async () => {
    setError(null);
    setBusy("apple");
    const res = await signInWithApple();
    setBusy(null);
    if (res.user) done("apple");
    else if (res.error && res.error !== "cancelled") setError(res.error);
  }, [done]);

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
          {t("auth.signInTitle")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          {t("auth.signInSubtitle")}
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
              autoComplete="current-password"
              textContentType="password"
              placeholder="••••••••"
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            <Pressable
              onPress={() => router.push("/(auth)/forgot-password")}
              hitSlop={8}
              style={styles.forgot}
            >
              <Text style={[styles.link, { color: theme.gold }]}>
                {t("auth.forgot")}
              </Text>
            </Pressable>

            {error && (
              <Text style={styles.error}>{t(`auth.error.${error}`)}</Text>
            )}

            <PrimaryButton
              label={t("auth.signIn")}
              onPress={submit}
              loading={busy === "email"}
              disabled={busy !== null}
              variant="gold"
            />

            {(isGoogleAuthAvailable() || isAppleAuthAvailable()) && (
              <View style={styles.dividerRow}>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
                <Text style={[styles.or, { color: theme.subText }]}>
                  {t("auth.or")}
                </Text>
                <View style={[styles.line, { backgroundColor: theme.border }]} />
              </View>
            )}

            {isGoogleAuthAvailable() && (
              <Pressable
                onPress={google}
                disabled={busy !== null}
                style={[
                  styles.social,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Feather name="chrome" size={18} color={theme.text} />
                <Text style={[styles.socialText, { color: theme.text }]}>
                  {t("auth.google")}
                </Text>
              </Pressable>
            )}

            {isAppleAuthAvailable() && (
              <Pressable
                onPress={apple}
                disabled={busy !== null}
                style={[
                  styles.social,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Feather name="command" size={18} color={theme.text} />
                <Text style={[styles.socialText, { color: theme.text }]}>
                  {t("auth.apple")}
                </Text>
              </Pressable>
            )}

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: theme.subText }]}>
                {t("auth.noAccount")}
              </Text>
              <Pressable onPress={() => router.replace("/(auth)/sign-up")} hitSlop={8}>
                <Text style={[styles.link, { color: theme.gold }]}>
                  {t("auth.signUp")}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Giriş her zaman opsiyonel — mağaza politikası ve UX gereği. */}
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
    marginBottom: 8,
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: fonts.body, lineHeight: 19 },
  forgot: { alignSelf: "flex-end", paddingVertical: 4, marginBottom: 14 },
  link: { fontSize: 13.5, fontFamily: fonts.bodySemi, fontWeight: "700" },
  error: {
    color: "#F5333B",
    fontSize: 13,
    fontFamily: fonts.bodyMed,
    marginBottom: 12,
    textAlign: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 22,
  },
  line: { flex: 1, height: 1 },
  or: {
    fontSize: 11.5,
    fontFamily: fonts.bodyBold,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  social: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    height: 52,
    marginBottom: 11,
  },
  socialText: { fontSize: 15, fontFamily: fonts.bodySemi, fontWeight: "700" },
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
