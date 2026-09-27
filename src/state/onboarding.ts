/**
 * İlk açılış akışının (onboarding → giriş) tamamlanma bayrağı.
 *
 * Bayrak düz "1" değil, uygulamanın KURULUM ZAMANI olarak saklanır. Android
 * otomatik yedeklemesi (allowBackup) sil-kur ya da yeni telefonda AsyncStorage'ı
 * geri yükler; düz bayrak da geri gelseydi ilk kez kuran kişi onboarding ve
 * giriş ekranını hiç görmezdi. Kurulum zamanı yeniden kurulumda değişir,
 * güncellemede değişmez — yedekten gelen bayrak böylece geçersiz sayılır,
 * kupon geçmişinin yedeği ise korunur.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

export const ONBOARDING_KEY = "@sanslab/onboarding-v1";

/** Bu kurulumun damgası; native modül yoksa (eski dev build) `null`. */
async function installStamp(): Promise<string | null> {
  try {
    const installed = await Application.getInstallationTimeAsync();
    return String(installed.getTime());
  } catch {
    return null;
  }
}

/** Akış BU kurulumda tamamlandı mı? */
export async function loadOnboarded(): Promise<boolean> {
  const [stored, stamp] = await Promise.all([
    AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null),
    installStamp(),
  ]);
  if (stored === null) return false;
  // Kurulum zamanı okunamıyorsa eski davranış: kayıt varsa tamamlanmış say.
  return stamp === null || stored === stamp;
}

export async function saveOnboarded(): Promise<void> {
  const stamp = await installStamp();
  await AsyncStorage.setItem(ONBOARDING_KEY, stamp ?? "1").catch(() => {});
}
