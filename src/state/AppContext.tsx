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
  hasPurchasesKey,
  linkUser,
  unlinkUser,
} from "../services/revenuecat";
import { observeUser, type AuthUser } from "../services/auth";
import { setUserProperties } from "../services/firebase";
import { teardownAds } from "../services/ads";
import {
  mergeHistories,
  pullHistory,
  pushHistoryChanges,
} from "../services/cloudSync";
import type { Coupon } from "../games/generator";
import {
  addToHistory,
  countFavorites,
  loadHistory,
  prependToHistory,
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
  /**
   * Premium durumu kesinleşmeden geçmiş BUDANMAZ: aksi halde açılışta ya da
   * yeni cihazda girişte Premium kullanıcının geçmişi — ve bulut yedeği —
   * RevenueCat yanıtı gelmeden ücretsiz sürüm sınırına inerdi.
   */
  const [premiumKnown, setPremiumKnown] = useState(false);

  // state'i efekt bağımlılığı yapmadan okuyabilmek için.
  const historyRef = useRef<SavedCoupon[]>([]);
  historyRef.current = history;
  const premiumRef = useRef(false);
  premiumRef.current = isPremium;
  const premiumKnownRef = useRef(false);
  premiumKnownRef.current = premiumKnown;
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  /** RevenueCat yanıtını uygular; yanıt yoksa ve anahtar varsa durum bilinmiyor. */
  const applyCustomerInfo = useCallback((info: CustomerInfo | null) => {
    if (info) {
      setIsPremium(hasPremium(info));
      setPremiumKnown(true);
    } else if (!hasPurchasesKey()) {
      setIsPremium(false);
      setPremiumKnown(true);
    }
  }, []);

  const refreshPremium = useCallback(async () => {
    applyCustomerInfo(await getCustomerInfo());
  }, [applyCustomerInfo]);

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
        applyCustomerInfo(info);
        if (hasPremium(info)) teardownAds();
      }),
    [applyCustomerInfo]
  );

  /* ----------------------- auth dinleyicisi ----------------------- */

  useEffect(
    () =>
      observeUser((u) => {
        userRef.current = u;
        setUser(u);
        // Hesap değişti: Premium bu hesaba göre yeniden çözülene kadar budama yok.
        if (u && hasPurchasesKey()) setPremiumKnown(false);
        // Premium'u hesaba bağla ki cihaz değişince taşınsın.
        (u ? linkUser(u.uid) : unlinkUser())
          .then((info) => {
            if (info) applyCustomerInfo(info);
          })
          .catch(() => {});
      }),
    [applyCustomerInfo]
  );

  /* -------------------- analytics kullanıcı özellikleri -------------------- */

  useEffect(() => {
    setUserProperties({ premium: isPremium, signedIn: Boolean(user) });
  }, [isPremium, user]);

  /* ------------------------- geçmiş yazımı ------------------------- */

  /**
   * Geçmişi önce CİHAZA yazar (asıl kaynak); giriş yapılmışsa değişikliği
   * buluta arka planda, beklemeden iletir.
   */
  const commitHistory = useCallback((next: SavedCoupon[]) => {
    const prev = historyRef.current;
    historyRef.current = next;
    setHistory(next);
    saveHistory(next);
    const uid = userRef.current?.uid;
    if (uid) pushHistoryChanges(uid, prev, next);
  }, []);

  /* --------- premium değişince geçmiş limitini yeniden uygula --------- */

  useEffect(() => {
    if (!hydrated || !premiumKnown) return;
    const prev = historyRef.current;
    const next = pruneHistory(prev, { isPremium });
    if (next.length !== prev.length) commitHistory(next);
  }, [isPremium, premiumKnown, hydrated, commitHistory]);

  /* ------------- girişte bulut yedeğini cihazdakiyle birleştir ------------- */

  const signedInUid = user?.uid;
  useEffect(() => {
    if (!hydrated || !signedInUid) return;
    const uid = signedInUid;
    let cancelled = false;
    pullHistory(uid).then((remote) => {
      if (cancelled || remote === null) return;
      const union = mergeHistories(historyRef.current, remote);
      // Premium durumu henüz bilinmiyorsa budama sonraya (yukarıdaki efekte) kalır.
      const merged = premiumKnownRef.current
        ? pruneHistory(union, { isPremium: premiumRef.current })
        : union;
      historyRef.current = merged;
      setHistory(merged);
      saveHistory(merged);
      // Bulutta olmayanları gönder, sınır dışında kalanları buluttan da sil.
      pushHistoryChanges(uid, remote, merged);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, signedInUid]);

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

  const recordCoupons = useCallback(
    (coupons: Coupon[]) => {
      const list = historyRef.current;
      // Premium durumu bilinmiyorsa budama, durum kesinleşince yapılır.
      const next = premiumKnownRef.current
        ? addToHistory(list, coupons, { isPremium: premiumRef.current })
        : prependToHistory(list, coupons);
      commitHistory(next);
    },
    [commitHistory]
  );

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
    commitHistory(toggleFav(list, uid));
    return true;
  }, [commitHistory]);

  const removeCoupon = useCallback(
    (couponUid: string) => {
      commitHistory(removeFromHistory(historyRef.current, couponUid));
    },
    [commitHistory]
  );

  const clearAllHistory = useCallback(() => {
    commitHistory([]);
  }, [commitHistory]);

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
