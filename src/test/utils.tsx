/* istanbul ignore file */
/**
 * Test yardımcıları — bileşenleri gerçek AppProvider ve i18n ile sarar.
 * Böylece testler tema, dil ve premium durumunu üretimdeki gibi görür.
 */
import React from "react";
import { render, type RenderOptions } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProvider } from "../state/AppContext";
import { initI18n } from "../i18n";

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export async function setupI18n(): Promise<void> {
  await initI18n();
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <AppProvider>{children}</AppProvider>
    </SafeAreaProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: Wrapper, ...options });
}

export * from "@testing-library/react-native";
