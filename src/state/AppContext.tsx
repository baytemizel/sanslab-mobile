import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CustomerInfo } from "react-native-purchases";

import { Theme, lightTheme, darkTheme } from "../theme/colors";
import { setLanguage as applyLanguage, Lang } from "../i18n";
import {
  getCustomerInfo,
  hasPremium,
  addCustomerInfoListener,
} from "../services/revenuecat";

type ThemePref = "system" | "light" | "dark";
const THEME_KEY = "@sanslab/theme";

interface AppState {
  theme: Theme;
  themePref: ThemePref;
  setThemePref: (p: ThemePref) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  isPremium: boolean;
  refreshPremium: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [themePref, setThemePrefState] = useState<ThemePref>("system");
  const [lang, setLangState] = useState<Lang>("tr");
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = (await AsyncStorage.getItem(THEME_KEY)) as ThemePref | null;
        if (t) setThemePrefState(t);
      } catch {
        /* ignore */
      }
      await refreshPremium();
    })();

    const unsub = addCustomerInfoListener((info: CustomerInfo) =>
      setIsPremium(hasPremium(info))
    );
    return unsub;
  }, []);

  const refreshPremium = useCallback(async () => {
    const info = await getCustomerInfo();
    setIsPremium(hasPremium(info));
  }, []);

  const setThemePref = useCallback((p: ThemePref) => {
    setThemePrefState(p);
    AsyncStorage.setItem(THEME_KEY, p).catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    applyLanguage(l);
  }, []);

  const theme = useMemo<Theme>(() => {
    const resolved =
      themePref === "system" ? (system === "dark" ? "dark" : "light") : themePref;
    return resolved === "dark" ? darkTheme : lightTheme;
  }, [themePref, system]);

  const value: AppState = {
    theme,
    themePref,
    setThemePref,
    lang,
    setLang,
    isPremium,
    refreshPremium,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
