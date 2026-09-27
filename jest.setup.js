/**
 * Jest ortak kurulumu — native modüller test ortamında mevcut olmadığı için
 * hepsi burada taklit edilir (mock). Amaç: saf mantık ve React bileşenlerini
 * cihaz olmadan doğrulayabilmek.
 */

/* @testing-library/react-native v13 eşleyicileri (matchers) kendiliğinden kurar. */

/* ----------------------------- expo-crypto ----------------------------- */
jest.mock("expo-crypto", () => ({
  getRandomValues: (buf) => {
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.floor(Math.random() * 0x100000000);
    }
    return buf;
  },
}));

/* ---------------------------- expo-clipboard ---------------------------- */
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ""),
}));

/* --------------------------- expo-splash-screen --------------------------- */
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(async () => true),
  hideAsync: jest.fn(async () => true),
  setOptions: jest.fn(),
}));

/* --------------------------- expo-localization --------------------------- */
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "tr", languageTag: "tr-TR" }],
}));

/* ------------------------------ expo-constants ------------------------------ */
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: "1.0.0",
      extra: {
        firebaseEnabled: false,
        revenuecat: { ios: "appl_REPLACE_ME", android: "goog_REPLACE_ME" },
        admob: {},
        auth: {},
        links: {
          privacy: "https://example.test/privacy",
          terms: "https://example.test/terms",
          support: "mailto:support@example.test",
        },
      },
    },
  },
}));

/* --------------------------- AsyncStorage --------------------------- */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

/* ---------------------------- RevenueCat ---------------------------- */
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    getCustomerInfo: jest.fn(async () => ({ entitlements: { active: {} } })),
    getOfferings: jest.fn(async () => ({ current: null })),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    isAnonymous: jest.fn(async () => true),
    logIn: jest.fn(async () => ({ customerInfo: { entitlements: { active: {} } } })),
    logOut: jest.fn(async () => ({ entitlements: { active: {} } })),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
  },
  LOG_LEVEL: { DEBUG: "DEBUG" },
}));

/* ------------------------------- AdMob ------------------------------- */
jest.mock("react-native-google-mobile-ads", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: () => ({
      initialize: jest.fn(async () => []),
      setRequestConfiguration: jest.fn(async () => {}),
    }),
    TestIds: { BANNER: "test-banner", INTERSTITIAL: "test-interstitial" },
    BannerAd: () => React.createElement("BannerAd"),
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: "ANCHORED_ADAPTIVE_BANNER" },
    MaxAdContentRating: { T: "T" },
    AdEventType: { LOADED: "loaded", CLOSED: "closed", ERROR: "error" },
    InterstitialAd: {
      createForAdRequest: () => ({
        addAdEventListener: () => () => {},
        load: jest.fn(),
        show: jest.fn(),
      }),
    },
    AdsConsent: {
      requestInfoUpdate: jest.fn(async () => ({
        isConsentFormAvailable: false,
        status: "NOT_REQUIRED",
      })),
      getConsentInfo: jest.fn(async () => ({
        canRequestAds: true,
        isConsentFormAvailable: false,
      })),
      getUserChoices: jest.fn(async () => ({})),
      showForm: jest.fn(async () => ({})),
      showPrivacyOptionsForm: jest.fn(async () => ({})),
      reset: jest.fn(),
    },
    AdsConsentStatus: { REQUIRED: "REQUIRED", NOT_REQUIRED: "NOT_REQUIRED" },
  };
});

/* ------------------------------ Firebase ------------------------------ */
jest.mock("@react-native-firebase/analytics", () => ({
  __esModule: true,
  default: () => ({
    setAnalyticsCollectionEnabled: jest.fn(async () => {}),
    logEvent: jest.fn(async () => {}),
    logScreenView: jest.fn(async () => {}),
    setUserProperty: jest.fn(async () => {}),
  }),
}));

jest.mock("@react-native-firebase/crashlytics", () => ({
  __esModule: true,
  default: () => ({
    setCrashlyticsCollectionEnabled: jest.fn(async () => {}),
    recordError: jest.fn(),
  }),
}));

jest.mock("@react-native-firebase/auth", () => ({
  __esModule: true,
  getAuth: () => {
    throw new Error("Firebase not configured in tests");
  },
}));

/* --------------------------- Google Sign-In --------------------------- */
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => ({ data: { idToken: null } })),
    signOut: jest.fn(async () => {}),
  },
}));

/* -------------------------- expo-application -------------------------- */
jest.mock("expo-application", () => ({
  getInstallationTimeAsync: jest.fn(async () => new Date(1700000000000)),
}));

/* --------------------------- Facebook SDK --------------------------- */
jest.mock("react-native-fbsdk-next", () => ({
  Settings: { initializeSDK: jest.fn() },
  LoginManager: {
    logInWithPermissions: jest.fn(async () => ({ isCancelled: true })),
    logOut: jest.fn(),
  },
  AccessToken: { getCurrentAccessToken: jest.fn(async () => null) },
  AuthenticationToken: { getAuthenticationTokenIOS: jest.fn(async () => null) },
}));

/* ------------------------ Google fonts (ağ yok) ------------------------ */
jest.mock("@expo-google-fonts/sora", () => ({
  useFonts: () => [true, null],
  Sora_700Bold: "Sora_700Bold",
  Sora_800ExtraBold: "Sora_800ExtraBold",
}));
jest.mock("@expo-google-fonts/inter", () => ({
  useFonts: () => [true, null],
  Inter_400Regular: "Inter_400Regular",
  Inter_500Medium: "Inter_500Medium",
  Inter_600SemiBold: "Inter_600SemiBold",
  Inter_700Bold: "Inter_700Bold",
}));

/* ------------------------------- Gürültü ------------------------------- */
// Beklenen "native modül yok" uyarıları testleri kirletmesin.
const originalWarn = console.warn;
console.warn = (...args) => {
  const first = String(args[0] ?? "");
  if (first.includes("[revenuecat]") || first.includes("[auth]") || first.includes("[ads]")) {
    return;
  }
  originalWarn(...args);
};
