# ŞansLab — HANDOFF

Uygulamayı geliştirici makinesinde çalıştırıp mağazaya göndermek için gereken
tüm adımlar. **Fazlar:** 1) authsuz çalışan app · 2) opsiyonel giriş ·
3) mağaza premium satışı.

---

## 0. Önkoşullar

| Araç | Sürüm | Not |
|------|-------|-----|
| Node | **≥ 20.19.4** (önerilen 22) | `.nvmrc` var → `nvm use` yeter. Node 18 ile Expo SDK 54 derlenmez. |
| JDK | 17 | Android Gradle Plugin gereksinimi |
| Android SDK | Platform 35 + build-tools | `ANDROID_HOME` tanımlı olmalı |
| eas-cli | son | `npm i -g eas-cli` |

```bash
nvm use && npm install
```

---

## 1. Anahtarsız çalıştırma (sıfır kurulum)

Depo **hiçbir gizli anahtar olmadan derlenir ve çalışır.** `app.config.ts`
eksik gizli dosyaları algılar ve ilgili eklentileri devre dışı bırakır:

| Eksik olan | Sonuç |
|---|---|
| `google-services.json` | Firebase eklentileri (Analytics/Crashlytics/**Auth**) kapanır; giriş ekranı "bu derlemede kullanılamıyor" der, uygulama misafir modunda tam çalışır |
| RevenueCat anahtarı | Satın alma kapanır, paywall bilgi mesajı gösterir, herkes free katmandadır |
| AdMob birim kimlikleri | Google **TestIds** kullanılır (kendi reklamına tıklama riski yok) |
| `GOOGLE_WEB_CLIENT_ID` | "Google ile devam et" butonu gizlenir |

```bash
npx expo prebuild -p android --clean
npx expo run:android
```

---

## 2. Doğrulama (CI ile aynı komutlar)

```bash
npm run verify
```

`typecheck` (tsc --noEmit) → `lint` (eslint) → `test:ci` (jest + coverage).
GitHub Actions için `.github/workflows/ci.yml` hazır; ayrıca gizli dosyalar
olmadan `expo config`'in çözümlendiğini doğrulayan ayrı bir job içerir.

Test kapsamı: üretim motoru invariant'ları (her oyun × her mod için havuz
aralığı/adet/tekrarsızlık), istatistik hesapları, geçmiş & favori budama
mantığı, premium kapıları, çeviri bütünlüğü ve 8 ekranın duman testleri.

---

## 3. Uygulama kimliği

**`com.oditteknoloji.sanslab`** — Android `package` ve iOS `bundleIdentifier`
aynıdır. Depodaki `google-services.json` de bu paket için üretilmiştir, bu
yüzden Firebase kutudan çıktığı gibi çalışır.

> **Bu değer artık dondurulmuştur.** Play Store'a ilk yükleme yapıldıktan sonra
> paket adı **DEĞİŞTİRİLEMEZ**; değiştirmek yeni bir uygulama listelemesi
> demektir (yorumlar, indirmeler, aboneler sıfırlanır).

`app.config.ts`, `google-services.json` içindeki paket adıyla `app.json`
arasındaki her uyuşmazlığı yakalar: eşleşmezse Gradle'ı
`processDebugGoogleServices` adımında kırmak yerine Firebase eklentilerini
devre dışı bırakır ve konsola ne yapılacağını yazar. Paket adı ya da Firebase
dosyası değişirse:

```bash
rm -rf android && npx expo prebuild -p android --clean
```

### iOS için kalan adım
Firebase Console'da **iOS** uygulaması da `com.oditteknoloji.sanslab` paket
kimliğiyle eklenmeli ve `GoogleService-Info.plist` proje köküne konmalıdır
(şu an yalnızca Android dosyası mevcut).

---

## 4. Değiştirilmesi gereken placeholder'lar

### `app.json → extra`
| Alan | Şu an | Yapılacak |
|------|-------|-----------|
| `eas.projectId` | `93ce342c-…-e0783dcc9e96` ✅ | Ayarlandı — dokunmayın |
| `revenuecat.ios` / `.android` | `*_REPLACE_ME` | RevenueCat public SDK key'leri |
| `admob.*` | `ca-app-pub-XXXX/XXXX` | Gerçek AdMob ad unit ID'leri |
| `auth.googleWebClientId` | `REPLACE_WITH_...` | Firebase Auth → Google → Web client ID |

Hepsi `.env` ile de geçilebilir — bkz. `.env.example`.

### `app.json → plugins`
- `react-native-google-mobile-ads.androidAppId/iosAppId`: şu an Google'ın
  **test App ID**'leri. Yayın öncesi kendi AdMob App ID'lerinle değiştir.
- `@react-native-google-signin/google-signin.iosUrlScheme`: iOS için
  `GoogleService-Info.plist` içindeki `REVERSED_CLIENT_ID`.

### Mağaza/iletişim bağlantıları
`app.json → extra.links` altında; kodda hard-code YOK.
`store/privacy-policy.md` ve `store/terms.md` içeriğini bu URL'lerde
**gerçekten yayınla** — Play/App Store gizlilik URL'si zorunludur ve
erişilemezse gönderim reddedilir.

---

## 5. Firebase (Faz 2 — giriş için gerekli)

1. Firebase Console → Android `com.oditteknoloji.sanslab` (**mevcut**),
   iOS `com.oditteknoloji.sanslab` (**eklenmeli** — bkz. §3).
2. `GoogleService-Info.plist` ve `google-services.json` dosyalarını **proje
   köküne** koy. `app.config.ts` varlıklarını algılayıp eklentileri kendisi
   ekler — `app.json`'a elle referans YAZMA.
3. Authentication → Sign-in method: **E-posta/Şifre**, **Google**,
   (iOS için) **Apple** sağlayıcılarını aç.
4. Analytics ve Crashlytics'i etkinleştir.

> Bu dosyalar gizlidir; `.gitignore` zaten hariç tutar.

---

## 6. RevenueCat (Faz 3)

1. RevenueCat projesi oluştur, App Store ve Play uygulamalarını bağla.
2. **Entitlement:** `premium` (kod bu adı bekliyor — `src/services/revenuecat.ts`).
3. **Offering:** `default`; aylık / yıllık / ömür boyu paketleri ekle.
4. App Store Connect ve Play Console'da ürün ID'lerini oluştur, RevenueCat'e bağla.
5. Public SDK key'lerini `extra.revenuecat`'e (ya da `.env`) yaz.

Paywall offering'i otomatik çeker; **fiyat kodda sabitlenmez**. Yıllık plan
varsayılan seçilir ve aylığa göre tasarruf yüzdesi rozeti hesaplanır
(`src/premium/packages.ts`).

Giriş yapan kullanıcı için `Purchases.logIn(uid)` otomatik çağrılır → premium
cihazlar arasında taşınır.

---

## 7. AdMob + rıza (UMP)

1. AdMob'da iki uygulama (iOS/Android) + her biri için **Banner** ve
   **Interstitial** birimi oluştur.
2. App ID'leri → `app.json` plugin ayarına; ad unit ID'leri → `extra.admob`.
3. **Privacy & messaging → GDPR mesajı** oluştur (AEA/UK/İsviçre için ZORUNLU).

Davranış (`src/services/ads.ts`, `src/services/consent.ts`):
- Açılışta önce UMP rızası toplanır; **rıza alınmadan hiçbir reklam isteği
  yapılmaz** (banner da render edilmez).
- Rıza yoksa/eksikse kişiselleştirilmemiş reklamlara düşülür.
- Banner free kullanıcıda oyun ekranının altında.
- Interstitial her **4.** üretimde ve iki gösterim arasında **en az 90 sn**.
- Premium'da tüm reklamlar kapalı; satın alma anında `teardownAds()` çalışır.
- Ayarlar → "Reklam tercihlerim" ile kullanıcı rızasını değiştirebilir.

---

## 8. Build & Test

```bash
eas init
eas build --profile development --platform android   # dev client
eas build --profile preview --platform android       # paylaşılabilir APK
```

Reklam / satın alma / Firebase yalnızca **dev build veya gerçek build** içinde
tam çalışır (Expo Go'da değil).

---

## 9. Mağaza Gönderimi

```bash
eas build --profile production --platform all
eas submit  --profile production --platform ios
eas submit  --profile production --platform android
```

### Metinler & görseller
- `store/metadata-tr.md`, `store/metadata-en.md`
- `store/screenshots/*.png` — 12 adet 1242×2688 mockup
- `store/privacy-policy.md`, `store/terms.md`

### Play Console — zorunlu formlar
- **Data safety:** Reklam kimliği (AD_ID), Analytics, Crashlytics; hesap
  oluşturuluyorsa e-posta + ad.
- **Hesap silme:** Uygulama içi akış **mevcut** (Ayarlar → Hesap → Hesabımı
  sil). Play formunda uygulama içi akışı işaretle; ayrıca web URL'si istenirse
  `support@odit.com.tr` üzerinden manuel süreç tanımla.
- **İçerik derecelendirmesi:** 17+/18+ — "Simulated Gambling".
- **İnceleme notu:** *"App only generates random numbers for entertainment.
  No real-money gambling, no betting, no ticket purchase. Not affiliated with
  any lottery operator."*

### Release imzalama
`android/app/build.gradle` release'i **debug keystore** ile imzalar (RN
şablonu). Yerel `assembleRelease` ALMA — EAS build kendi keystore'unu yönetir.

---

## 10. Premium kapıları (tek kaynak)

`src/premium/gates.ts`. Paywall'da vaat edilen her faydanın burada gerçek bir
karşılığı vardır ve `gates.test.ts` bunu doğrular:

| Fayda | Kapı |
|---|---|
| Reklamsız | `showsAds()` |
| Tüm üretim modları | `canUseMode()` — free yalnızca `random` |
| Sınırsıza yakın geçmiş + favori | `historyLimit()` (free 10) / `favoriteLimit()` (free 3) |
| Geçmişi dışa aktar | `canExportHistory()` |
| Erken erişim | — (destek vaadi) |

> **Mağaza uyarısı:** paywall'a yeni bir vaat eklerken önce `gates.ts`'e
> gerçek karşılığını ekle. Uygulamada bulunmayan bir özelliği satmak
> App Store 3.1.2 / Play Payments kapsamında **red sebebidir**.

---

## 11. Üretim mantığı (özet)

`src/games/generator.ts`:
- `secureRandomInt` — `expo-crypto`/Web Crypto + rejection sampling (modulo
  sapması yok), yoksa `Math.random` fallback.
- `pickUnique` — kısmi Fisher-Yates ile tekrarsız çekiliş.
- Modlar: `random` (saf), `balanced` (tek/çift ve aralık dengesi sezgiseli),
  `lowshare` (anti-kalabalık), `formula` (ŞansFormülü bileşik skor).
- Oyun kuralları tek kaynak: `src/games/config.ts` (`GAMES`). Yeni oyun
  eklemek = bu diziye bir `GameDef` eklemek. Premium kapıları oyun bazında
  DEĞİL özellik bazındadır.

### ŞansFormülü
- Motor: `src/games/formula.ts` — 7 bileşenli bileşik skor (F frekans, R form,
  G gecikme, P ikili sinerji, S toplam bandı, B desen, A anti-kalabalık).
- Veri: `src/games/fstats.ts` — temiz-dönem arşiv istatistikleri gömülü.
  Yalnızca `sayisal`, `super`, `sans` oyunlarında etkin (`hasFormula()`).
- Tazeleme: `python3 tools/export_fstats.py <arşiv.xlsx>`.

---

## 12. Yasal/etik hatırlatma

Uygulama kazanma şansını artırmaz ve bunu açıkça beyan eder. Dengeli /
Az Paylaşılan / ŞansFormülü modları pazarlama amaçlı bir üstünlük olarak
**sunulmamalıdır**. Bu beyanların metinde kalması `i18n.test.ts` tarafından
otomatik doğrulanır — testleri kırmadan kaldıramazsın, bu kasıtlıdır.

---

İletişim: support@odit.com.tr · © 2026 Odit Teknoloji
