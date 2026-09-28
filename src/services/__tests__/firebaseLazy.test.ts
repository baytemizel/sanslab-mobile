/**
 * Regresyon: Firebase servis dosyası olmadan derlenen release açılışta
 * çöküyordu — crashlytics modülü YÜKLENİRKEN varsayılan Firebase uygulamasını
 * arar ve yoksa fırlatır. firebase.ts bu modülleri dosya başında import
 * etmemeli; yalnızca Firebase yapılandırılmışken tembel yüklemeli.
 */
describe("firebase servisi — Firebase yapılandırılmamış derleme", () => {
  it("analytics/crashlytics'i yüklemeden import edilir ve çağrılar sessiz kalır", async () => {
    await jest.isolateModulesAsync(async () => {
      const boom = () => {
        throw new Error("No Firebase App '[DEFAULT]' has been created");
      };
      jest.doMock("@react-native-firebase/crashlytics", boom);
      jest.doMock("@react-native-firebase/analytics", boom);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fb = require("../firebase");
      await expect(fb.initFirebase()).resolves.toBeUndefined();
      expect(fb.isFirebaseReady()).toBe(false);
      await expect(fb.logEvent("x")).resolves.toBeUndefined();
      expect(() => fb.logError(new Error("e"))).not.toThrow();
    });
  });
});
