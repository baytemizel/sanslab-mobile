# ŞansLab — HANDOFF

Bu doküman, uygulamayı geliştirici makinesinde çalıştırıp mağazaya göndermek için gereken tüm adımları içerir.

---

## 0. Önkoşullar
- Node 20+ ve npm
- `npm i -g eas-cli`
- Expo hesabı (`eas login`)
- Apple Developer + Google Play Console hesapları
- Firebase, AdMob, RevenueCat hesapları

---

## 1. Kurulum
```bash
cd sanslab
npm install
npx expo install      # SDK 54 sürüm hizalaması (sürüm uyuşmazlıklarını giderir)
```

> **Tasarım bağımlılıkları (yeni):** `react-native-svg` (parlayan toplar/glow), `expo-linear-gradient` (gradyanlar), `expo-font` + `@expo-google-fonts/sora` & `@expo-google-fonts/inter` (Sora/Inter), `expo-crypto` (CSPRNG). `react-native-svg` yerel bir modüldür → Expo Go'da çoğu çalışır ama tam doğrulama için **dev build / EAS build** önerilir. Fontlar `_layout.tsx`'te `useFonts` ile yüklenir; yüklenene kadar altın spinner görünür.

---

## 2. Değiştirilmesi gereken placeholder'lar

### a) `app.json → extra`
| Alan | Şu an | Yapılacak |
|------|-------|-----------|
| `eas.projectId` | `REPLACE_WITH_EAS_PROJECT_ID` | `eas init` sonrası otomatik dolar |
| `revenuecat.ios` | `appl_REPLACE_ME` | RevenueCat iOS public SDK key |
| `revenuecat.android` | `goog_REPLACE_ME` | RevenueCat Android public SDK key |
| `admob.banner*/interstitial*` | `ca-app-pub-XXXX/XXXX` | Gerçek AdMob ad unit ID'leri |

### b) `app.json → plugins → react-native-google-mobile-ads`
`androidAppId` / `iosAppId` şu an Google'ın **test App ID**'leridir. Yayın öncesi kendi AdMob App ID'lerinizle değiştirin.

> **Not:** `src/services/ads.ts` geliştirme modunda (`__DEV__`) otomatik olarak Google **TestIds** kullanır; canlıda `extra.admob` değerlerini okur. Yani test ederken kendi reklamlarınıza tıklama riski yoktur.

### c) Mağaza/iletişim bağlantıları
- Gizlilik: `https://odit.com.tr/sanslab/privacy`
- Şartlar: `https://odit.com.tr/sanslab/terms`
`store/privacy-policy.md` ve `store/terms.md` içeriğini bu URL'lerde yayınlayın (App Store/Play gizlilik URL'si zorunludur).

---

## 3. Firebase
1. Firebase Console → iki uygulama ekle: iOS `com.odit.sanslab`, Android `com.odit.sanslab`.
2. **GoogleService-Info.plist** (iOS) ve **google-services.json** (Android) indir.
3. Proje köküne koy ve `app.json`'a referansla:
   ```jsonc
   "ios":     { "googleServicesFile": "./GoogleService-Info.plist", ... },
   "android": { "googleServicesFile": "./google-services.json", ... }
   ```
4. Analytics ve Crashlytics'i etkinleştir. (Kod `src/services/firebase.ts` içinde Expo Go'da zarifçe devre dışı kalır.)

> Bu dosyalar gizli olduğundan repoya eklenmedi; `.gitignore` zaten hariç tutuyor.

---

## 4. RevenueCat
1. RevenueCat projesi oluştur, App Store ve Play uygulamalarını bağla.
2. **Entitlement:** `premium` (kod bu adı bekliyor — `src/services/revenuecat.ts`).
3. **Offering:** `default`; içine paketleri ekle (aylık / yıllık / ömür boyu).
4. App Store Connect ve Play Console'da ürün ID'lerini oluştur ve RevenueCat'e bağla.
5. iOS/Android public SDK key'lerini `app.json → extra.revenuecat`'e yaz.

Paywall ekranı (`app/paywall.tsx`) offering'i otomatik çeker; sabit fiyat kodlanmaz.

---

## 5. AdMob
1. AdMob'da iki uygulama (iOS/Android) + her biri için **Banner** ve **Interstitial** birimi oluştur.
2. App ID'leri → `app.json` plugin ayarına; ad unit ID'leri → `extra.admob`.
3. Davranış: banner free kullanıcıda altta görünür; interstitial her **4.** üretimde gösterilir; premium'da tüm reklamlar kapalıdır (`onGenerateForAds(isPremium)`).

---

## 6. Build & Test
```bash
eas init                       # projectId üretir
eas build --profile development --platform android   # dev client
# veya tam test:
eas build --profile preview --platform android       # paylaşılabilir APK
```
Reklam/satın alma/Firebase yalnızca **dev build veya gerçek build** içinde tam çalışır (Expo Go'da değil).

---

## 7. Mağaza Gönderimi
```bash
eas build --profile production --platform all
eas submit  --profile production --platform ios
eas submit  --profile production --platform android
```

### Mağaza metinleri & görseller
- Metinler: `store/metadata-tr.md`, `store/metadata-en.md`
- Ekran görüntüleri: `store/screenshots/*.png` — **12 adet** "Gece Çekilişi" mockup'ı (1242×2688): 01 hero, 02 ana ekran, 03 Sayısal+Joker, 04 Süper, 05 Şans Topu, 06 10-kupon, 07 Hızlı On, 08 modlar, 09 Premium, 10 Ayarlar, 11 gündüz teması, 12 dürüstlük notu. App Store için 3–10, Play için 2–8 görsel yükleyebilirsin; sıralamayı vitrin etkisine göre seç (öneri: 01, 02, 03, 06, 09).
- Gizlilik/Şartlar: `store/privacy-policy.md`, `store/terms.md`

### Önemli inceleme notları (red riskini azaltır)
- **Yaş derecesi:** 17+/18+ — "Simulated Gambling".
- İnceleme notuna ekleyin: *"App only generates random numbers for entertainment. No real-money gambling, no betting, no ticket purchase. Not affiliated with any lottery operator."*
- Apple: Gerçek para kumarı olmadığı için coğrafi kısıt gerekmez; yine de operatörle bağlantısızlık ekranda belirtilir (settings → sorumlu oyun).

---

## 8. Üretim mantığı (özet)
`src/games/generator.ts`:
- `secureRandomInt` — `expo-crypto`/Web Crypto + rejection sampling (modulo bias yok), yoksa `Math.random` fallback.
- `pickUnique` — Fisher-Yates ile tekrarsız çekiliş.
- Modlar: `random` (saf), `balanced` (tek/çift ve aralık dengesi sezgiseli), `weighted` (frekans — yalnızca görünüm, olasılığı değiştirmez).
- Oyun kuralları tek kaynak: `src/games/config.ts` (`GAMES`). Yeni oyun eklemek = bu diziye bir `GameDef` eklemek.

---

## 9. Yasal/etik hatırlatma
Uygulama kazanma şansını artırmaz ve bunu açıkça beyan eder. Dengeli / Az Paylaşılan / ŞansFormülü modları pazarlama amaçlı bir üstünlük olarak **sunulmamalıdır**; mevcut metinler bunları dürüst çerçevede konumlandırır. Bu çerçeveyi koruyun.

## ŞansFormülü modu (özet)

- Motor: `src/games/formula.ts` — 7 bileşenli bileşik skor (F frekans, R form, G gecikme, P ikili sinerji, S toplam bandı, B desen, A anti-kalabalık; ağırlıklar dosyada `W`).
- Veri: `src/games/fstats.ts` — temiz-dönem arşiv istatistikleri gömülü (~50 KB). Yalnızca `sayisal`, `super`, `sans` oyunlarında etkin (`hasFormula()`), diğer oyunlarda mod seçeneği görünmez.
- Tazeleme: yeni çekilişler eklendikçe `python3 tools/export_fstats.py <arşiv.xlsx>` çalıştırın; `fstats.ts` otomatik güncellenir. Analiz CLI'ı: `tools/sans_formulu.py`.
- Premium: Rastgele dışındaki tüm modlar gibi ŞansFormülü de premium kapısından geçer.
- Beyan: mod açıklaması "kazanma olasılığını artırmaz" ifadesini içerir — kaldırmayın.

---

İletişim: support@odit.com.tr · © 2026 Odit Teknoloji
