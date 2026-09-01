import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";

import tr from "./tr";
import en from "./en";

export const LANGUAGE_KEY = "@sanslab/language";
export const SUPPORTED = ["tr", "en"] as const;
export type Lang = (typeof SUPPORTED)[number];

function deviceLang(): Lang {
  const code = Localization.getLocales()[0]?.languageCode ?? "en";
  return code === "tr" ? "tr" : "en";
}

export async function initI18n(): Promise<void> {
  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    saved = null;
  }
  const lng = (saved as Lang) ?? deviceLang();

  await i18n.use(initReactI18next).init({
    compatibilityJSON: "v4",
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export async function setLanguage(lang: Lang): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export default i18n;
