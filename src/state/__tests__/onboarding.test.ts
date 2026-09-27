/**
 * İlk açılış bayrağı kurulum zamanına bağlıdır: Android yedeğinden geri gelen
 * bayrak yeni kurulumda geçersiz sayılmalı, güncellemede ise korunmalı.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

import { ONBOARDING_KEY, loadOnboarded, saveOnboarded } from "../onboarding";

const getInstallTime = Application.getInstallationTimeAsync as jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  getInstallTime.mockResolvedValue(new Date(1700000000000));
});

describe("onboarding bayrağı", () => {
  it("kayıt yoksa akış tamamlanmamıştır", async () => {
    await expect(loadOnboarded()).resolves.toBe(false);
  });

  it("aynı kurulumda kaydedilince tamamlanmış sayılır (güncelleme)", async () => {
    await saveOnboarded();
    expect(await AsyncStorage.getItem(ONBOARDING_KEY)).toBe("1700000000000");
    await expect(loadOnboarded()).resolves.toBe(true);
  });

  it("yedekten geri gelen başka kurulumun kaydı geçersizdir (sil-kur)", async () => {
    await saveOnboarded();
    // Yeniden kurulum: kurulum zamanı değişti, AsyncStorage yedekten döndü.
    getInstallTime.mockResolvedValue(new Date(1800000000000));
    await expect(loadOnboarded()).resolves.toBe(false);
  });

  it("eski düz '1' kaydı da yeni kurulumda geçersizdir", async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    await expect(loadOnboarded()).resolves.toBe(false);
  });

  it("kurulum zamanı okunamazsa eski davranışa düşer, çökmez", async () => {
    getInstallTime.mockRejectedValue(new Error("native module missing"));
    await saveOnboarded();
    expect(await AsyncStorage.getItem(ONBOARDING_KEY)).toBe("1");
    await expect(loadOnboarded()).resolves.toBe(true);
  });
});
