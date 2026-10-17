import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Field from "../src/components/Field";
import { PrimaryButton } from "../src/components/Buttons";
import { useApp } from "../src/state/AppContext";
import {
  deleteAccount,
  isAuthAvailable,
  signOut,
  type AuthErrorCode,
} from "../src/services/auth";
import { clearHistory } from "../src/state/history";
import { logEvent } from "../src/services/firebase";
import { fonts } from "../src/theme/colors";

export default function Account() {
  const { t } = useTranslation();
  const { theme, user, isPremium, clearAllHistory } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const usesPassword = user?.providers.includes("password") ?? false;

  const doSignOut = useCallback(async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
    logEvent("logout");
    router.back();
  }, [router]);

  const doDelete = useCallback(async () => {
    setError(null);
    setBusy(true);
    const err = await deleteAccount(usesPassword ? password : undefined);
    setBusy(false);

    if (err) {
      setError(err);
      return;
    }
    // Hesapla birlikte cihazdaki kişisel veriyi de temizle.
    await clearHistory();
    clearAllHistory();
    logEvent("account_deleted");
    setConfirmOpen(false);
    router.replace("/");
  }, [password, usesPassword, clearAllHistory, router]);

  if (!isAuthAvailable() || !user) {
    return (
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 60,
          paddingBottom: 44,
        }}
      >
        <Stack.Screen options={{ title: t("account.title") }} />
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: theme.goldFill }]}>
            <Feather name="user" size={26} color={theme.onGold} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t("account.guestTitle")}
          </Text>
          <Text style={[styles.emptyBody, { color: theme.subText }]}>
            {t("account.guestBody")}
          </Text>
          {isAuthAvailable() ? (
            <PrimaryButton
              label={t("auth.signIn")}
              onPress={() => router.push("/(auth)/sign-in")}
              variant="gold"
            />
          ) : (
            <Text style={[styles.emptyBody, { color: theme.subText }]}>
              {t("auth.unavailable")}
            </Text>
          )}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: insets.top + 60,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: t("account.title") }} />

      {/* profil */}
      <View
        style={[
          styles.profile,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: theme.goldFill }]}>
          <Text style={[styles.avatarText, { color: theme.onGold }]}>
            {(user.displayName ?? user.email ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: theme.text }]}>
          {user.displayName ?? t("account.noName")}
        </Text>
        <Text style={[styles.email, { color: theme.subText }]}>{user.email}</Text>

        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              {
                borderColor: isPremium ? theme.goldFill : theme.border,
                backgroundColor: isPremium ? theme.goldFill : "transparent",
              },
            ]}
          >
            <Feather
              name={isPremium ? "star" : "user"}
              size={12}
              color={isPremium ? theme.onGold : theme.subText}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isPremium ? theme.onGold : theme.subText },
              ]}
            >
              {isPremium ? t("common.premium") : t("common.free")}
            </Text>
          </View>
          {!user.emailVerified && user.email && (
            <View style={[styles.badge, { borderColor: theme.border }]}>
              <Feather name="alert-circle" size={12} color={theme.subText} />
              <Text style={[styles.badgeText, { color: theme.subText }]}>
                {t("account.unverified")}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* eylemler — ekranın altında */}
      <View style={{ flex: 1, minHeight: 24 }} />
      <View>
        <Pressable
          onPress={doSignOut}
          disabled={busy}
          style={[
            styles.row,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Feather name="log-out" size={17} color={theme.text} />
          <Text style={[styles.rowLabel, { color: theme.text }]}>
            {t("account.signOut")}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setError(null);
            setPassword("");
            setConfirmOpen(true);
          }}
          disabled={busy}
          hitSlop={8}
          style={styles.deleteLink}
        >
          <Text style={styles.deleteText}>{t("account.delete")}</Text>
        </Pressable>
      </View>

      <Text style={[styles.note, { color: theme.subText }]}>
        {t("account.deleteNote")}
      </Text>

      {/* hesap silme onayı — mağaza zorunluluğu */}
      <Modal visible={confirmOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.cardSolid, borderColor: theme.border },
            ]}
          >
            <View style={[styles.modalIcon, { backgroundColor: "#F5333B" }]}>
              <Feather name="alert-triangle" size={24} color="#fff" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {t("account.deleteConfirmTitle")}
            </Text>
            <Text style={[styles.modalBody, { color: theme.subText }]}>
              {t("account.deleteConfirmBody")}
            </Text>

            {usesPassword && (
              <Field
                label={t("auth.password")}
                icon="lock"
                value={password}
                onChangeText={setPassword}
                secure
                autoCapitalize="none"
                placeholder="••••••••"
              />
            )}

            {error && (
              <Text style={styles.error}>
                {error === "requires-recent-login"
                  ? t("account.reauthNeeded")
                  : t(`auth.error.${error}`)}
              </Text>
            )}

            <Pressable
              onPress={doDelete}
              disabled={busy || (usesPassword && !password)}
              style={[
                styles.dangerBtn,
                { opacity: busy || (usesPassword && !password) ? 0.5 : 1 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.dangerText}>{t("account.deleteConfirm")}</Text>
              )}
            </Pressable>

            <PrimaryButton
              label={t("common.cancel")}
              onPress={() => setConfirmOpen(false)}
              variant="ghost"
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profile: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { fontSize: 28, fontFamily: fonts.displayHeavy, fontWeight: "900" },
  name: { fontSize: 20, fontFamily: fonts.display, fontWeight: "800" },
  email: { fontSize: 13.5, fontFamily: fonts.body, marginTop: 4 },
  badges: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap", justifyContent: "center" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 11.5, fontFamily: fonts.bodyBold, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  rowLabel: { fontSize: 15, fontFamily: fonts.bodyMed, fontWeight: "600" },
  deleteLink: { alignSelf: "center", marginTop: 18, paddingVertical: 4 },
  deleteText: {
    color: "#F5333B",
    fontSize: 13,
    fontFamily: fonts.bodyMed,
    fontWeight: "600",
  },
  note: {
    fontSize: 11.5,
    fontFamily: fonts.body,
    lineHeight: 17,
    marginTop: 10,
    textAlign: "center",
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 26,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.displayHeavy,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: fonts.body,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20,
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(5,4,15,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: { width: "100%", borderRadius: 26, borderWidth: 1, padding: 24 },
  modalIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
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
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 13.5,
    fontFamily: fonts.body,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 18,
  },
  error: {
    color: "#F5333B",
    fontSize: 13,
    fontFamily: fonts.bodyMed,
    marginBottom: 12,
    textAlign: "center",
  },
  dangerBtn: {
    backgroundColor: "#F5333B",
    borderRadius: 16,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },
  dangerText: { color: "#fff", fontSize: 16, fontFamily: fonts.display, fontWeight: "800" },
});
