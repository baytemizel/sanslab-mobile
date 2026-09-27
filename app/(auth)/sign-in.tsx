import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import SocialButton, { type SocialProvider } from "../../src/components/SocialButton";
import { useApp } from "../../src/state/AppContext";
import {
  isAppleAuthAvailable,
  isAuthAvailable,
  isFacebookAuthAvailable,
  isGoogleAuthAvailable,
  signInWithApple,
  signInWithFacebook,
  signInWithGoogle,
  type AuthErrorCode,
  type AuthResult,
} from "../../src/services/auth";
import { logEvent } from "../../src/services/firebase";
import { fonts } from "../../src/theme/colors";

/** Platforma göre giriş seçenekleri, üstten alta bu sırayla. */
const IOS_PROVIDERS: SocialProvider[] = ["apple", "google", "facebook"];
const ANDROID_PROVIDERS: SocialProvider[] = ["google", "facebook"];

const SIGN_IN: Record<SocialProvider, () => Promise<AuthResult>> = {
  apple: signInWithApple,
  google: signInWithGoogle,
  facebook: signInWithFacebook,
};

const CONFIGURED: Record<SocialProvider, () => boolean> = {
  apple: isAppleAuthAvailable,
  google: isGoogleAuthAvailable,
  facebook: isFacebookAuthAvailable,
};

const LABEL: Record<SocialProvider, string> = {
  apple: "auth.apple",
  google: "auth.google",
  facebook: "auth.facebook",
};

export default function SignIn() {
  const { t } = useTranslation();
  const { theme, onboarded, completeOnboarding } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  // Yayın derlemesinde anahtarı girilmemiş sağlayıcı gizlenir; geliştirmede
  // tasarım görülebilsin diye gösterilir (dokununca "kullanılamıyor" der).
  const providers = (
    Platform.OS === "ios" ? IOS_PROVIDERS : ANDROID_PROVIDERS
  ).filter((p) => __DEV__ || CONFIGURED[p]());
  const available = isAuthAvailable() && providers.length > 0;

  /**
   * Ayarlar/Hesap'tan açıldıysa modal kapanır. İlk açılış akışında
   * (onboarding'den geldiysek) giriş adımı geçilmiş sayılır: akış tamamlanır
   * ve ana ekrana geçilir — sonraki açılışlarda onboarding/giriş gösterilmez.
   */
  const leave = useCallback(async () => {
    if (onboarded) {
      router.back();
      return;
    }
    await completeOnboarding();
    router.replace("/");
  }, [onboarded, completeOnboarding, router]);

  const signIn = useCallback(
    async (provider: SocialProvider) => {
      setError(null);
      setBusy(provider);
      const res = await SIGN_IN[provider]();
      setBusy(null);
      if (res.user) {
        logEvent("login", { method: provider });
        await leave();
      } else if (res.error && res.error !== "cancelled") {
        setError(res.error);
      }
    },
    [leave]
  );

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        onPress={leave}
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

      {/* giriş seçenekleri sayfanın sonunda */}
      <View style={styles.bottom}>
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
            {error && (
              <Text style={styles.error}>{t(`auth.error.${error}`)}</Text>
            )}
            {providers.map((p) => (
              <SocialButton
                key={p}
                provider={p}
                label={t(LABEL[p])}
                onPress={() => signIn(p)}
                loading={busy === p}
                disabled={busy !== null}
              />
            ))}
          </>
        )}

        {/* Giriş her zaman opsiyonel — mağaza politikası ve UX gereği. */}
        <Pressable
          onPress={leave}
          accessibilityRole="link"
          style={styles.guest}
        >
          <Text style={[styles.guestText, { color: theme.subText }]}>
            {t("auth.continueAsGuest")}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24 },
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
  },
  // marginTop:auto → kalan boşluğu yutar, blok ekranın altına oturur.
  bottom: { marginTop: "auto", paddingTop: 32, gap: 11 },
  notice: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: fonts.body, lineHeight: 19 },
  error: {
    color: "#F5333B",
    fontSize: 13,
    fontFamily: fonts.bodyMed,
    marginBottom: 4,
    textAlign: "center",
  },
  guest: { alignItems: "center", paddingTop: 12, paddingBottom: 10 },
  guestText: {
    fontSize: 13.5,
    fontFamily: fonts.bodySemi,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
