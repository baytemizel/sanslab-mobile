import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
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

import { AppProvider, useApp } from "../src/state/AppContext";
import Backdrop from "../src/components/Backdrop";
import { initI18n } from "../src/i18n";
import { initFirebase } from "../src/services/firebase";
import { initPurchases } from "../src/services/revenuecat";
import { initAds } from "../src/services/ads";
import { palette } from "../src/theme/colors";

function ThemedStack() {
  const { theme } = useApp();
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
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="game/[id]" options={{ title: "" }} />
        <Stack.Screen name="stats/[id]" options={{ title: "" }} />
        <Stack.Screen name="paywall" options={{ presentation: "modal", title: "", headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: "" }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Sora_700Bold,
    Sora_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    (async () => {
      await initI18n();
      await initPurchases();
      await initFirebase();
      initAds();
      setReady(true);
    })();
  }, []);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.inkBottom }}>
        <ActivityIndicator size="large" color={palette.gold} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <ThemedStack />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
