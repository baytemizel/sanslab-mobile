import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomerInfo } from "react-native-purchases";

import { Theme, lightTheme, darkTheme } from "../theme/colors";
import i18n, { setLanguage as applyLanguage, Lang } from "../i18n";
import {
  addCustomerInfoListener,
  getCustomerInfo,
  hasPremium,
  linkUser,
  unlinkUser,
} from "../services/revenuecat";
import { observeUser, type AuthUser } from "../services/auth";
import { setUserProperties } from "../services/firebase";
import { teardownAds } from "../services/ads";
import type { Coupon } from "../games/generator";
import {
  addToHistory,
  countFavorites,
  loadHistory,
  pruneHistory,
  removeFromHistory,
  saveHistory,
  toggleFavorite as toggleFav,
  type SavedCoupon,
} from "./history";
import { canFavorite } from "../premium/gates";
import { loadOnboarded, saveOnboarded } from "./onboarding";

export type ThemePref = "system" | "light" | "dark";

export const THEME_KEY = "@sanslab/theme";
export { ONBOARDING_KEY } from "./onboarding";

interface AppState {
  /* tema & dil */
  theme: Theme;
  themePref: ThemePref;
  setThemePref: (p: ThemePref) => void;
  lang: Lang;
  setLang: (l: Lang) => void;

  /* premium */
  isPremium: boolean;
  refreshPremium: () => Promise<void>;

  /* auth (Faz 2) — giriş opsiyoneldir, misafir modu tam çalışır */
  user: AuthUser | null;
  isSignedIn: boolean;

  /* onboarding */
  onboarded: boolean;
  completeOnboarding: () => Promise<void>;

  /* geçmiş & favoriler (Faz 3) */
  history: SavedCoupon[];
  favoriteCount: number;
  recordCoupons: (coupons: Coupon[]) => void;
  toggleFavorite: (uid: string) => boolean;
  removeCoupon: (uid: string) => void;
  clearAllHistory: () => void;

  /** Kalıcı durum (tema/dil/onboarding/geçmiş) diskten okundu mu? */
  hydrated: boolean;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();

  const [themePref, setThemePrefState] = useState<ThemePref>("system");
  const [lang, setLangState] = useState<Lang>((i18n.language as Lang) ?? "tr");
  const [isPremium, setIsPremium] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [history, setHistory] = useState<SavedCoupon[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // history state'ini efekt bağımlılığı yapmadan okuyabilmek için.
  const historyRef = useRef<SavedCoupon[]>([]);
  historyRef.current = history;
  const premiumRef = useRef(false);
  premiumRef.current = isPremium;

  const refreshPremium = useCallback(async () => {
    const info = await getCustomerInfo();
    setIsPremium(hasPremium(info));
  }, []);

  /* ------------------------- ilk yükleme ------------------------- */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [storedTheme, storedOnboarded, storedHistory] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY).catch(() => null),
        loadOnboarded(),
        loadHistory(),
      ]);

      if (cancelled) return;
      if (storedTheme) setThemePrefState(storedTheme as ThemePref);
      setOnboarded(storedOnboarded);
      setHistory(storedHistory);
      setLangState((i18n.language as Lang) ?? "tr");
      setHydrated(true);

      await refreshPremium();
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshPremium]);

  /* --------------------- premium dinleyicisi --------------------- */

  useEffect(
    () =>
      addCustomerInfoListener((info: CustomerInfo) => {
        const premium = hasPremium(info);
        setIsPremium(premium);
        if (premium) teardownAds();
      }),
    []
  );

  /* ----------------------- auth dinleyicisi ----------------------- */

  useEffect(
    () =>
      observeUser((u) => {
        setUser(u);
        // Premium'u hesaba bağla ki cihaz değişince taşınsın.
        (u ? linkUser(u.uid) : unlinkUser())
          .then((info) => {
            if (info) setIsPremium(hasPremium(info));
          })
          .catch(() => {});
      }),
    []
  );

  /* -------------------- analytics kullanıcı özellikleri -------------------- */

  useEffect(() => {
    setUserProperties({ premium: isPremium, signedIn: Boolean(user) });
  }, [isPremium, user]);

  /* --------- premium değişince geçmiş limitini yeniden uygula --------- */

  useEffect(() => {
    if (!hydrated) return;
    setHistory((prev) => {
      const next = pruneHistory(prev, { isPremium });
      if (next.length !== prev.length) saveHistory(next);
      return next;
    });
  }, [isPremium, hydrated]);

  /* ------------------------- eylemler ------------------------- */

  const setThemePref = useCallback((p: ThemePref) => {
    setThemePrefState(p);
    AsyncStorage.setItem(THEME_KEY, p).catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    applyLanguage(l).catch(() => {});
  }, []);

  const completeOnboarding = useCallback(async () => {
    setOnboarded(true);
    await saveOnboarded();
  }, []);

  const recordCoupons = useCallback((coupons: Coupon[]) => {
    const next = addToHistory(historyRef.current, coupons, {
      isPremium: premiumRef.current,
    });
    setHistory(next);
    saveHistory(next);
  }, []);

  /** Favori limiti aşıldıysa `false` döner (çağıran taraf paywall açar). */
  const toggleFavorite = useCallback((uid: string): boolean => {
    const list = historyRef.current;
    const target = list.find((c) => c.uid === uid);
    if (
      target &&
      !target.favorite &&
      !canFavorite(countFavorites(list), { isPremium: premiumRef.current })
    ) {
      return false;
    }
    const next = toggleFav(list, uid);
    setHistory(next);
    saveHistory(next);
    return true;
  }, []);

  const removeCoupon = useCallback((uid: string) => {
    const next = removeFromHistory(historyRef.current, uid);
    setHistory(next);
    saveHistory(next);
  }, []);

  const clearAllHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  /* ------------------------- türetilenler ------------------------- */

  const theme = useMemo<Theme>(() => {
    const resolved =
      themePref === "system" ? (system === "dark" ? "dark" : "light") : themePref;
    return resolved === "dark" ? darkTheme : lightTheme;
  }, [themePref, system]);

  const favoriteCount = useMemo(() => countFavorites(history), [history]);

  const value = useMemo<AppState>(
    () => ({
      theme,
      themePref,
      setThemePref,
      lang,
      setLang,
      isPremium,
      refreshPremium,
      user,
      isSignedIn: Boolean(user),
      onboarded,
      completeOnboarding,
      history,
      favoriteCount,
      recordCoupons,
      toggleFavorite,
      removeCoupon,
      clearAllHistory,
      hydrated,
    }),
    [
      theme,
      themePref,
      setThemePref,
      lang,
      setLang,
      isPremium,
      refreshPremium,
      user,
      onboarded,
      completeOnboarding,
      history,
      favoriteCount,
      recordCoupons,
      toggleFavorite,
      removeCoupon,
      clearAllHistory,
      hydrated,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
