import React, { useCallback, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import SocialButton, { type SocialProvider } from "./SocialButton";
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
  type AuthUser,
} from "../services/auth";
import { logEvent } from "../services/firebase";
import { fonts } from "../theme/colors";

/** Platforma göre giriş seçenekleri, üstten alta bu sırayla. */
const IOS_PROVIDERS: SocialProvider[] = ["apple", "google", "facebook"];
const ANDROID_PROVIDERS: SocialProvider[] = ["google", "facebook"];

const SIGN_IN: Record<SocialProvider, () => Promise<AuthResult>> = {
  apple: () => signInWithApple(),
  google: () => signInWithGoogle(),
  facebook: () => signInWithFacebook(),
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

/**
 * Bu derlemede sunulan sağlayıcılar. Yayın derlemesinde anahtarı girilmemiş
 * sağlayıcı gizlenir; geliştirmede tasarım görülebilsin diye gösterilir
 * (dokununca "kullanılamıyor" der).
 */
export function socialProviders(): SocialProvider[] {
  return (Platform.OS === "ios" ? IOS_PROVIDERS : ANDROID_PROVIDERS).filter(
    (p) => __DEV__ || CONFIGURED[p]()
  );
}

/** Bu derlemede sosyal girişle oturum açılabilir mi? */
export function canSignIn(): boolean {
  return isAuthAvailable() && socialProviders().length > 0;
}

interface Props {
  /** Başarılı girişten sonra çağrılır. İptal ve hatalar burada gösterilir. */
  onSignedIn: (user: AuthUser) => void | Promise<void>;
}

/** Sosyal giriş butonları + hata metni (giriş ekranı ve giriş sayfası ortak). */
export default function SocialSignInButtons({ onSignedIn }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const signIn = useCallback(
    async (provider: SocialProvider) => {
      setError(null);
      setBusy(provider);
      const res = await SIGN_IN[provider]();
      setBusy(null);
      if (res.user) {
        logEvent("login", { method: provider });
        await onSignedIn(res.user);
      } else if (res.error && res.error !== "cancelled") {
        setError(res.error);
      }
    },
    [onSignedIn]
  );

  return (
    <View style={styles.list}>
      {error && <Text style={styles.error}>{t(`auth.error.${error}`)}</Text>}
      {socialProviders().map((p) => (
        <SocialButton
          key={p}
          provider={p}
          label={t(LABEL[p])}
          onPress={() => signIn(p)}
          loading={busy === p}
          disabled={busy !== null}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 11 },
  error: {
    color: "#F5333B",
    fontSize: 13,
    fontFamily: fonts.bodyMed,
    marginBottom: 4,
    textAlign: "center",
  },
});
