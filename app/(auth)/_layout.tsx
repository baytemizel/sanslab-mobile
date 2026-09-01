import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";

import Backdrop from "../../src/components/Backdrop";
import { useApp } from "../../src/state/AppContext";

/**
 * Auth grubu — modal olarak sunulur ve HİÇBİR ZAMAN zorunlu değildir.
 * Kullanıcı her ekranı kapatıp misafir olarak devam edebilir.
 */
export default function AuthLayout() {
  const { theme } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Backdrop />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </View>
  );
}
