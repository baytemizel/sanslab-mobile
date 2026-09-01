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
import { sendPasswordReset, type AuthErrorCode } from "../../src/services/auth";
import { fonts } from "../../src/theme/colors";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { theme } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    setBusy(true);
    const err = await sendPasswordReset(email);
    setBusy(false);
    // Hesabın var olup olmadığını sızdırmamak için "user-not-found" da başarı sayılır.
    if (!err || err === "user-not-found") setSent(true);
    else setError(err);
  }, [email]);

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
          accessibilityLabel={t("common.back")}
          style={[
            styles.closeBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>

        <Text style={[styles.title, { color: theme.text }]}>
          {t("auth.resetTitle")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          {t("auth.resetSubtitle")}
        </Text>

        {sent ? (
          <View
            style={[
              styles.sent,
              { backgroundColor: theme.card, borderColor: theme.goldFill },
            ]}
          >
            <View style={[styles.sentIcon, { backgroundColor: theme.goldFill }]}>
              <Feather name="mail" size={20} color={theme.onGold} />
            </View>
            <Text style={[styles.sentText, { color: theme.text }]}>
              {t("auth.resetSent")}
            </Text>
            <PrimaryButton
              label={t("common.close")}
              onPress={() => router.back()}
              variant="gold"
            />
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
              onSubmitEditing={submit}
              returnKeyType="send"
            />
            {error && <Text style={styles.error}>{t(`auth.error.${error}`)}</Text>}
            <PrimaryButton
              label={t("auth.sendReset")}
              onPress={submit}
              loading={busy}
              disabled={!email.trim()}
              variant="gold"
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
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
  error: {
    color: "#F5333B",
    fontSize: 13,
    fontFamily: fonts.bodyMed,
    marginBottom: 12,
    textAlign: "center",
  },
  sent: { borderWidth: 1.5, borderRadius: 22, padding: 22, alignItems: "center" },
  sentIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  sentText: {
    fontSize: 14.5,
    fontFamily: fonts.body,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
  },
});
