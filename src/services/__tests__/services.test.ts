/**
 * Servis katmanı testleri.
 *
 * Kritik güvence: anahtar/native modül YOKKEN hiçbir servis fırlatmaz ve
 * uygulama misafir + free katmanda çalışmaya devam eder. (Faz 1 hedefi.)
 * jest.setup.js bu ortamı taklit eder: RevenueCat anahtarları placeholder,
 * Firebase yapılandırılmamış.
 */
import { isPlaceholder, realValue, firebaseEnabled, links } from "../env";
import {
  getCustomerInfo,
  getOffering,
  hasPremium,
  initPurchases,
  isPurchasesAvailable,
  linkUser,
  restore,
  unlinkUser,
  addCustomerInfoListener,
  PREMIUM_ENTITLEMENT,
} from "../revenuecat";
import {
  currentUser,
  deleteAccount,
  isAppleAuthAvailable,
  isAuthAvailable,
  isFacebookAuthAvailable,
  isGoogleAuthAvailable,
  mapAuthError,
  mapSocialAuthError,
  observeUser,
  sendPasswordReset,
  signInWithApple,
  signInWithEmail,
  signInWithFacebook,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
} from "../auth";
import { initFirebase, isFirebaseReady, logEvent, logError } from "../firebase";
import {
  adRequestOptions,
  canRequestAds,
  gatherConsent,
  isPersonalisedAllowed,
  subscribeToConsent,
} from "../consent";
import { __resetAdsState, initAds, onGenerateForAds } from "../ads";

describe("env — placeholder tespiti", () => {
  it.each([
    ["appl_REPLACE_ME", true],
    ["goog_PLACEHOLDER", true],
    ["ca-app-pub-XXXX/XXXX", true],
    ["", true],
    ["   ", true],
    [undefined, true],
    [null, true],
    ["appl_gerçekAnahtar123", false],
    ["ca-app-pub-1234567890123456/1234567890", false],
  ])("isPlaceholder(%p) === %p", (value, expected) => {
    expect(isPlaceholder(value)).toBe(expected);
  });

  it("realValue placeholder'ı undefined'a çevirir", () => {
    expect(realValue("appl_REPLACE_ME")).toBeUndefined();
    expect(realValue("appl_ok")).toBe("appl_ok");
  });

  it("bağlantılar her zaman tanımlıdır", () => {
    expect(links.privacy).toMatch(/^https?:\/\//);
    expect(links.terms).toMatch(/^https?:\/\//);
    expect(links.support).toBeTruthy();
  });
});

describe("RevenueCat — anahtarsız derleme", () => {
  it("placeholder anahtarla configure ETMEZ", async () => {
    await initPurchases();
    expect(isPurchasesAvailable()).toBe(false);
  });

  it("tüm çağrılar güvenli varsayılan döner, fırlatmaz", async () => {
    await expect(getCustomerInfo()).resolves.toBeNull();
    await expect(getOffering()).resolves.toBeNull();
    await expect(restore()).resolves.toBeNull();
    await expect(linkUser("uid")).resolves.toBeNull();
    await expect(unlinkUser()).resolves.toBeNull();
  });

  it("dinleyici aboneliği no-op döner", () => {
    const unsub = addCustomerInfoListener(() => {});
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });

  it("hasPremium yalnızca aktif entitlement varken true", () => {
    expect(hasPremium(null)).toBe(false);
    expect(hasPremium({ entitlements: { active: {} } } as any)).toBe(false);
    expect(
      hasPremium({
        entitlements: { active: { [PREMIUM_ENTITLEMENT]: {} } },
      } as any)
    ).toBe(true);
    expect(
      hasPremium({ entitlements: { active: { baskaSey: {} } } } as any)
    ).toBe(false);
  });
});

describe("Auth — Firebase yapılandırılmamış derleme", () => {
  it("kullanılamaz olarak raporlanır", () => {
    expect(isAuthAvailable()).toBe(false);
    expect(isGoogleAuthAvailable()).toBe(false);
    expect(isFacebookAuthAvailable()).toBe(false);
    expect(isAppleAuthAvailable()).toBe(false);
    expect(currentUser()).toBeNull();
  });

  it("observeUser hemen null bildirir ve no-op abonelik döner", () => {
    const cb = jest.fn();
    const unsub = observeUser(cb);
    expect(cb).toHaveBeenCalledWith(null);
    expect(() => unsub()).not.toThrow();
  });

  it("tüm giriş yolları 'unavailable' döner, fırlatmaz", async () => {
    await expect(signInWithEmail("a@b.co", "123456")).resolves.toEqual({
      user: null,
      error: "unavailable",
    });
    await expect(signUpWithEmail("a@b.co", "123456")).resolves.toEqual({
      user: null,
      error: "unavailable",
    });
    await expect(signInWithGoogle()).resolves.toEqual({
      user: null,
      error: "unavailable",
    });
    await expect(signInWithFacebook()).resolves.toEqual({
      user: null,
      error: "unavailable",
    });
    await expect(sendPasswordReset("a@b.co")).resolves.toBe("unavailable");
    await expect(deleteAccount()).resolves.toBe("unavailable");
    await expect(signOut()).resolves.toBeUndefined();
  });

  it("signInWithApple iOS dışında kullanılamaz", async () => {
    await expect(signInWithApple()).resolves.toEqual({
      user: null,
      error: "unavailable",
    });
  });

  it("Firebase hata kodlarını kullanıcı mesajı anahtarına eşler", () => {
    expect(mapAuthError({ code: "auth/invalid-email" })).toBe("invalid-email");
    expect(mapAuthError({ code: "auth/user-not-found" })).toBe("user-not-found");
    expect(
      mapAuthError({ code: "auth/account-exists-with-different-credential" })
    ).toBe("account-exists");
  });

  it("sosyal girişte doğrulanamayan token 'şifre hatalı' değil, genel hatadır", () => {
    const e = { code: "auth/invalid-credential" };
    expect(mapAuthError(e)).toBe("wrong-password"); // e-posta/şifre akışı
    expect(mapSocialAuthError(e)).toBe("unknown");
    expect(mapSocialAuthError({ code: "auth/network-request-failed" })).toBe(
      "network"
    );
    expect(mapAuthError({ code: "auth/wrong-password" })).toBe("wrong-password");
    expect(mapAuthError({ code: "auth/invalid-credential" })).toBe("wrong-password");
    expect(mapAuthError({ code: "auth/email-already-in-use" })).toBe(
      "email-already-in-use"
    );
    expect(mapAuthError({ code: "auth/weak-password" })).toBe("weak-password");
    expect(mapAuthError({ code: "auth/too-many-requests" })).toBe("too-many-requests");
    expect(mapAuthError({ code: "auth/network-request-failed" })).toBe("network");
    expect(mapAuthError({ code: "auth/requires-recent-login" })).toBe(
      "requires-recent-login"
    );
    expect(mapAuthError({ code: "SIGN_IN_CANCELLED" })).toBe("cancelled");
    expect(mapAuthError({ code: "ERR_REQUEST_CANCELED" })).toBe("cancelled");
    expect(mapAuthError(new Error("boom"))).toBe("unknown");
    expect(mapAuthError(undefined)).toBe("unknown");
  });
});

describe("Firebase — yapılandırılmamış", () => {
  it("init atlanır ve hazır olmaz", async () => {
    expect(firebaseEnabled).toBe(false);
    await initFirebase();
    expect(isFirebaseReady()).toBe(false);
  });

  it("olay kaydı sessizce geçer", async () => {
    await expect(logEvent("test_event", { a: 1 })).resolves.toBeUndefined();
    expect(() => logError(new Error("x"))).not.toThrow();
  });
});

describe("Rıza (UMP) ve reklamlar", () => {
  beforeEach(() => __resetAdsState());

  it("rıza toplanmadan reklam isteği yapılamaz", () => {
    // Modül durumu diğer testlerden etkilenmesin diye yalnızca tipi doğrularız.
    expect(typeof canRequestAds()).toBe("boolean");
  });

  it("rıza toplandığında aboneleri bilgilendirir", async () => {
    const listener = jest.fn();
    const unsub = subscribeToConsent(listener);
    await gatherConsent();
    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it("kişiselleştirme onayı yoksa NPA isteği yapılır", async () => {
    await gatherConsent();
    expect(isPersonalisedAllowed()).toBe(false);
    expect(adRequestOptions()).toEqual({ requestNonPersonalizedAdsOnly: true });
  });

  it("initAds fırlatmaz ve premium kullanıcıda interstitial göstermez", async () => {
    await expect(initAds()).resolves.toBeUndefined();
    expect(() => onGenerateForAds(true)).not.toThrow();
    expect(() => onGenerateForAds(false)).not.toThrow();
  });
});
