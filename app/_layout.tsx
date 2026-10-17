import React, { useCallback, useEffect, useState } from "react";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import {
  useFonts,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { PlayfairDisplay_800ExtraBold_Italic } from "@expo-google-fonts/playfair-display";

import { AppProvider, useApp } from "../src/state/AppContext";
import Backdrop from "../src/components/Backdrop";
import { initI18n } from "../src/i18n";
import { initFirebase } from "../src/services/firebase";
import { initPurchases } from "../src/services/revenuecat";
import { initAds } from "../src/services/ads";
import { palette } from "../src/theme/colors";

export { ErrorBoundary } from "expo-router";

/**
 * Native splash'i biz kapatacağız: fontlar, i18n ve kalıcı durum hazır olana
 * kadar açık kalsın. Böylece "beyaz/spinner flash" olmaz.
 */
SplashScreen.preventAutoHideAsync().catch(() => {
  /* bazı ortamlarda (web/test) desteklenmez */
});
SplashScreen.setOptions?.({ duration: 300, fade: true });

/* ------------------------------ Navigasyon ------------------------------ */

function RootNavigator({ onReady }: { onReady: () => void }) {
  const { theme, onboarded, hydrated } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const navReady = Boolean(useRootNavigationState()?.key);

  /**
   * İlk açılış akışı: onboarding → giriş ekranı (opsiyonel, misafir geçilebilir).
   * Akış bitene kadar yalnızca bu iki bölüme izin verilir; `onboarded` giriş
   * adımı geçilince yazılır, sonraki açılışlarda ikisi de gösterilmez.
   */
  const inIntro = segments[0] === "onboarding" || segments[0] === "(auth)";
  const routeOk = onboarded ? segments[0] !== "onboarding" : inIntro;

  useEffect(() => {
    // Navigator hazır olmadan yönlendirme fırlatır; hazır olunca tekrar çalışır.
    if (!hydrated || !navReady || routeOk) return;
    router.replace(onboarded ? "/" : "/onboarding");
  }, [hydrated, navReady, routeOk, onboarded, router]);

  // Splash, kullanıcı doğru ekrana varınca kapanır: ana sayfa bir kare bile
  // görünüp onboarding'e zıplamaz. Yönlendirme takılırsa yine de kapanır.
  useEffect(() => {
    if (!hydrated) return;
    if (routeOk) {
      onReady();
      return;
    }
    const fallback = setTimeout(onReady, 1500);
    return () => clearTimeout(fallback);
  }, [hydrated, routeOk, onReady]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Backdrop />
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerTintColor: theme.gold,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: "Sora_700Bold", color: theme.text },
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: "transparent" },
          // Ekranlar şeffaf (ortak Backdrop görünsün diye). Varsayılan geçişte
          // eski ekran 450ms boyunca yerinde kalıp yenisiyle üst üste biniyordu;
          // kısa çapraz geçişte ikisi birlikte solar.
          animation: "fade",
          animationDuration: 200,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false, animation: "fade" }}
        />
        {/* oyun ve ayarlar ekranları kendi kayan header'ını çizer (ScreenHeader) */}
        <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="stats/[id]" options={{ title: "" }} />
        <Stack.Screen name="history" options={{ title: "" }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ title: "" }} />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: "modal",
            title: "",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            presentation: "modal",
            headerShown: false,
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </View>
  );
}

/* -------------------------------- Kök -------------------------------- */

export default function RootLayout() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Sora_700Bold,
    Sora_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_800ExtraBold_Italic,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // i18n açılış için kritik — diğerleri paralel ve hataya dayanıklı.
      await initI18n().catch(() => {});
      if (cancelled) return;
      setBootstrapped(true);

      // Ağ/SDK işleri ilk kareyi bloklamasın.
      Promise.allSettled([initPurchases(), initFirebase(), initAds()]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hideSplash = useCallback(() => {
    if (splashHidden) return;
    setSplashHidden(true);
    SplashScreen.hideAsync().catch(() => {});
  }, [splashHidden]);

  // Font yüklemesi başarısız olsa bile (offline vb.) uygulamayı kilitleme.
  const fontsReady = fontsLoaded || Boolean(fontError);

  if (!bootstrapped || !fontsReady) {
    // Native splash hâlâ görünür durumda; boş bir tuval yeterli.
    return <View style={{ flex: 1, backgroundColor: palette.inkBottom }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <RootNavigator onReady={hideSplash} />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
