/**
 * Kimlik doğrulama / Authentication  (FAZ 2)
 *
 * ────────────────────────────────────────────────────────────────────────
 * TASARIM KURALI / DESIGN RULE
 * Giriş ZORUNLU DEĞİLDİR. Uygulamanın tüm üretim özellikleri misafir
 * kullanıcıya açıktır. Giriş yalnızca şunları sağlar:
 *   • Premium'un cihazlar arası taşınması (RevenueCat kimlik eşlemesi)
 *   • Kupon geçmişinin hesaba bağlanması
 * Firebase yapılandırılmamışsa buradaki her şey sessizce devre dışı kalır ve
 * uygulama misafir modunda tam çalışır.
 * ────────────────────────────────────────────────────────────────────────
 */

import { Platform } from "react-native";

import { authConfig, firebaseEnabled } from "./env";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providers: string[];
}

export type AuthErrorCode =
  | "invalid-email"
  | "user-not-found"
  | "wrong-password"
  | "email-already-in-use"
  | "weak-password"
  | "too-many-requests"
  | "network"
  | "cancelled"
  | "requires-recent-login"
  | "account-exists"
  | "unavailable"
  | "unknown";

export interface AuthResult {
  user: AuthUser | null;
  error?: AuthErrorCode;
}

/* ----------------------- Tembel modül yükleme ----------------------- */
/* Firebase yoksa import'un kendisi bile patlayabilir; bu yüzden lazy. */

let _authModule: any | null = null;
let _authUnavailable = false;

function authApi(): any | null {
  if (_authUnavailable) return null;
  if (_authModule) return _authModule;
  if (!firebaseEnabled) {
    _authUnavailable = true;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _authModule = require("@react-native-firebase/auth");
    // getAuth() burada bir kez denenir; Firebase app yoksa fırlatır.
    _authModule.getAuth();
    return _authModule;
  } catch (e) {
    if (__DEV__) console.warn("[auth] Firebase Auth kullanılamıyor:", e);
    _authUnavailable = true;
    _authModule = null;
    return null;
  }
}

/** Bu derlemede giriş özelliği gerçekten kullanılabilir mi? */
export function isAuthAvailable(): boolean {
  return authApi() !== null;
}

/** Google ile giriş bu derlemede yapılandırıldı mı? */
export function isGoogleAuthAvailable(): boolean {
  return isAuthAvailable() && Boolean(authConfig.googleWebClientId);
}

/** Facebook ile giriş bu derlemede yapılandırıldı mı (App ID + client token)? */
export function isFacebookAuthAvailable(): boolean {
  return isAuthAvailable() && Boolean(authConfig.facebookAppId);
}

/** Apple ile giriş yalnızca iOS'ta ve Firebase varken. */
export function isAppleAuthAvailable(): boolean {
  return isAuthAvailable() && Platform.OS === "ios";
}

/* ------------------------------ Eşleme ------------------------------ */

function toAuthUser(u: any | null): AuthUser | null {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,
    emailVerified: Boolean(u.emailVerified),
    providers: (u.providerData ?? []).map((p: any) => p.providerId),
  };
}

export function mapAuthError(e: any): AuthErrorCode {
  const code = String(e?.code ?? "");
  if (code.includes("invalid-email")) return "invalid-email";
  if (code.includes("user-not-found")) return "user-not-found";
  if (code.includes("wrong-password") || code.includes("invalid-credential"))
    return "wrong-password";
  if (code.includes("email-already-in-use")) return "email-already-in-use";
  if (code.includes("weak-password")) return "weak-password";
  if (code.includes("too-many-requests")) return "too-many-requests";
  if (code.includes("network")) return "network";
  if (code.includes("requires-recent-login")) return "requires-recent-login";
  // Aynı e-posta başka bir sağlayıcıyla (ör. Google) zaten kayıtlı.
  if (code.includes("account-exists-with-different-credential"))
    return "account-exists";
  if (code === "SIGN_IN_CANCELLED" || e?.code === "ERR_REQUEST_CANCELED")
    return "cancelled";
  return "unknown";
}

/* ------------------------------ Gözlem ------------------------------ */

/**
 * Oturum durumunu dinler. Firebase yoksa hemen `null` bildirir ve no-op
 * abonelik döner — çağıran taraf her iki durumda da aynı kodu kullanır.
 */
export function observeUser(cb: (user: AuthUser | null) => void): () => void {
  const api = authApi();
  if (!api) {
    cb(null);
    return () => {};
  }
  try {
    return api.onAuthStateChanged(api.getAuth(), (u: any) => cb(toAuthUser(u)));
  } catch (e) {
    if (__DEV__) console.warn("[auth] observe failed:", e);
    cb(null);
    return () => {};
  }
}

export function currentUser(): AuthUser | null {
  const api = authApi();
  if (!api) return null;
  try {
    return toAuthUser(api.getAuth().currentUser);
  } catch {
    return null;
  }
}

/* --------------------------- E-posta akışı --------------------------- */

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const api = authApi();
  if (!api) return { user: null, error: "unavailable" };
  try {
    const cred = await api.signInWithEmailAndPassword(
      api.getAuth(),
      email.trim(),
      password
    );
    return { user: toAuthUser(cred.user) };
  } catch (e) {
    return { user: null, error: mapAuthError(e) };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  const api = authApi();
  if (!api) return { user: null, error: "unavailable" };
  try {
    const cred = await api.createUserWithEmailAndPassword(
      api.getAuth(),
      email.trim(),
      password
    );
    if (displayName?.trim()) {
      await api.updateProfile(cred.user, { displayName: displayName.trim() });
    }
    try {
      await api.sendEmailVerification(cred.user);
    } catch {
      /* doğrulama e-postası kritik değil */
    }
    return { user: toAuthUser(cred.user) };
  } catch (e) {
    return { user: null, error: mapAuthError(e) };
  }
}

export async function sendPasswordReset(
  email: string
): Promise<AuthErrorCode | null> {
  const api = authApi();
  if (!api) return "unavailable";
  try {
    await api.sendPasswordResetEmail(api.getAuth(), email.trim());
    return null;
  } catch (e) {
    return mapAuthError(e);
  }
}

/* ---------------------------- Google ---------------------------- */

export async function signInWithGoogle(): Promise<AuthResult> {
  const api = authApi();
  if (!api) return { user: null, error: "unavailable" };
  const webClientId = authConfig.googleWebClientId;
  if (!webClientId) return { user: null, error: "unavailable" };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require("@react-native-google-signin/google-signin");
    GoogleSignin.configure({ webClientId });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();
    const idToken = response?.data?.idToken ?? response?.idToken;
    if (!idToken) return { user: null, error: "cancelled" };

    const credential = api.GoogleAuthProvider.credential(idToken);
    const cred = await api.signInWithCredential(api.getAuth(), credential);
    return { user: toAuthUser(cred.user) };
  } catch (e) {
    // DEVELOPER_ERROR (10) → Firebase'de bu imzanın SHA-1'i kayıtlı değil.
    if (__DEV__) console.warn("[auth] Google girişi başarısız:", e);
    return { user: null, error: mapAuthError(e) };
  }
}

/* ---------------------------- Apple ---------------------------- */

export async function signInWithApple(): Promise<AuthResult> {
  const api = authApi();
  if (!api) return { user: null, error: "unavailable" };
  if (Platform.OS !== "ios") return { user: null, error: "unavailable" };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AppleAuthentication = require("expo-apple-authentication");
    const credentialResponse = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credentialResponse.identityToken) {
      return { user: null, error: "cancelled" };
    }
    const credential = api.AppleAuthProvider.credential(
      credentialResponse.identityToken
    );
    const cred = await api.signInWithCredential(api.getAuth(), credential);

    const fullName = credentialResponse.fullName;
    const name = [fullName?.givenName, fullName?.familyName]
      .filter(Boolean)
      .join(" ");
    if (name && !cred.user.displayName) {
      await api.updateProfile(cred.user, { displayName: name });
    }
    return { user: toAuthUser(cred.user) };
  } catch (e) {
    return { user: null, error: mapAuthError(e) };
  }
}

/* ---------------------------- Facebook ---------------------------- */

export async function signInWithFacebook(): Promise<AuthResult> {
  const api = authApi();
  if (!api) return { user: null, error: "unavailable" };
  if (!authConfig.facebookAppId) return { user: null, error: "unavailable" };

  try {
    const {
      AccessToken,
      AuthenticationToken,
      LoginManager,
      Settings,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("react-native-fbsdk-next");
    // Otomatik başlatma kapalı (gizlilik): SDK yalnızca kullanıcı Facebook'a
    // dokununca başlar.
    Settings.initializeSDK();

    const permissions = ["public_profile", "email"];
    let credential: any;

    if (Platform.OS === "ios") {
      // iOS: izleme izni olmadan Facebook "Limited Login" döner; Firebase bunu
      // OIDC token + nonce ile doğrular.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Crypto = require("expo-crypto");
      const nonce = Crypto.randomUUID();
      const nonceSha256 = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce
      );
      const result = await LoginManager.logInWithPermissions(
        permissions,
        "limited",
        nonceSha256
      );
      if (result.isCancelled) return { user: null, error: "cancelled" };
      const token = await AuthenticationToken.getAuthenticationTokenIOS();
      if (!token?.authenticationToken) return { user: null, error: "cancelled" };
      credential = api.FacebookAuthProvider.credential(
        token.authenticationToken,
        nonce
      );
    } else {
      const result = await LoginManager.logInWithPermissions(permissions);
      if (result.isCancelled) return { user: null, error: "cancelled" };
      const token = await AccessToken.getCurrentAccessToken();
      if (!token?.accessToken) return { user: null, error: "cancelled" };
      credential = api.FacebookAuthProvider.credential(token.accessToken);
    }

    const cred = await api.signInWithCredential(api.getAuth(), credential);
    return { user: toAuthUser(cred.user) };
  } catch (e) {
    if (__DEV__) console.warn("[auth] Facebook girişi başarısız:", e);
    return { user: null, error: mapAuthError(e) };
  }
}

/* ---------------------------- Oturum ---------------------------- */

export async function signOut(): Promise<void> {
  const api = authApi();
  if (!api) return;
  try {
    await api.signOut(api.getAuth());
  } catch (e) {
    if (__DEV__) console.warn("[auth] signOut failed:", e);
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require("@react-native-google-signin/google-signin");
    await GoogleSignin.signOut();
  } catch {
    /* Google oturumu yoksa sorun değil */
  }
  if (authConfig.facebookAppId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { LoginManager } = require("react-native-fbsdk-next");
      LoginManager.logOut();
    } catch {
      /* Facebook oturumu yoksa sorun değil */
    }
  }
}

/**
 * Hesabı kalıcı olarak siler. Google Play ve App Store, hesap oluşturulabilen
 * uygulamalarda UYGULAMA İÇİ hesap silme akışını ZORUNLU tutar.
 *
 * `requires-recent-login` dönerse çağıran taraf kullanıcıdan yeniden giriş
 * isteyip tekrar denemelidir.
 */
export async function deleteAccount(
  password?: string
): Promise<AuthErrorCode | null> {
  const api = authApi();
  if (!api) return "unavailable";
  try {
    const auth = api.getAuth();
    const user = auth.currentUser;
    if (!user) return "user-not-found";

    if (password && user.email) {
      const credential = api.EmailAuthProvider.credential(user.email, password);
      await api.reauthenticateWithCredential(user, credential);
    }
    await api.deleteUser(user);
    return null;
  } catch (e) {
    return mapAuthError(e);
  }
}
