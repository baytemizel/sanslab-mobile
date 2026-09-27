/**
 * Ekran duman testleri (smoke tests).
 *
 * Amaç: ekranlar üyeliksiz / premium'suz / anahtar'sız bir derlemede
 * ÇÖKMEDEN render olsun ve temel akış (kupon üretimi, premium kapısı)
 * çalışsın. Faz 1'in "authsuz çalışır" hedefinin otomatik güvencesidir.
 */
/* eslint-disable import/first -- jest.mock çağrıları import'lardan önce gelmeli */
import React from "react";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
  useSegments: () => [],
  Stack: Object.assign(() => null, { Screen: () => null }),
  Link: ({ children }: any) => children,
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  act,
  fireEvent,
  renderWithProviders,
  screen,
  setupI18n,
  waitFor,
} from "../../src/test/utils";
import Home from "../index";
import GameScreen from "../game/[id]";
import Onboarding from "../onboarding";
import HistoryScreen from "../history";
import Paywall from "../paywall";
import Settings from "../settings";
import Account from "../account";
import StatsScreen from "../stats/[id]";
import SignIn from "../(auth)/sign-in";
import SignUp from "../(auth)/sign-up";
import ForgotPassword from "../(auth)/forgot-password";
import { GAMES } from "../../src/games/config";
import tr from "../../src/i18n/tr";

beforeAll(async () => {
  await setupI18n();
});

beforeEach(async () => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockBack.mockClear();
  mockParams = {};
  // Testler arası sızıntı olmasın: geçmiş/tema/onboarding bayrakları sıfırlanır.
  await AsyncStorage.clear();
});

/** AsyncStorage okumaları ve premium sorgusu ilk render'dan sonra biter. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("Ana ekran", () => {
  it("marka, hero ve beş oyunun tamamı görünür", async () => {
    renderWithProviders(<Home />);
    await settle();

    expect(screen.getByText("Şans")).toBeTruthy();
    expect(screen.getByText("Lab")).toBeTruthy();
    for (const g of GAMES) {
      const name = g.nameKey.split(".").reduce((o: any, k) => o[k], tr as any);
      expect(screen.getByText(name)).toBeTruthy();
    }
  });

  it("free kullanıcıya premium şeridini gösterir ve paywall'a götürür", async () => {
    renderWithProviders(<Home />);
    await settle();

    fireEvent.press(screen.getByText(tr.premium.title));
    expect(mockPush).toHaveBeenCalledWith("/paywall");
  });

  it("dürüstlük notu her zaman ekranda", async () => {
    renderWithProviders(<Home />);
    await settle();
    expect(screen.getByText(tr.disclaimer.short)).toBeTruthy();
  });
});

describe("Oyun ekranı", () => {
  it("kupon üretir ve sonucu gösterir", async () => {
    mockParams = { id: "sayisal" };
    renderWithProviders(<GameScreen />);
    await settle();

    expect(screen.getByText(tr.generator.empty)).toBeTruthy();

    fireEvent.press(screen.getByText(tr.common.generate));
    await settle();

    await waitFor(() => {
      expect(screen.queryByText(tr.generator.empty)).toBeNull();
    });
    // Kupon kaydedildi bilgisi ve "tekrar üret" etiketi belirir.
    expect(screen.getByText(tr.common.regenerate)).toBeTruthy();
    expect(screen.getByText(tr.history.savedHint)).toBeTruthy();
  });

  it("üretim sürerken buton disabled olur, kuponlar dönüş bitince gelir", async () => {
    jest.useFakeTimers();
    try {
      mockParams = { id: "sayisal" };
      renderWithProviders(<GameScreen />);
      await settle();

      fireEvent.press(screen.getByText(tr.common.generate));
      expect(screen.getByText(tr.common.generate)).toBeDisabled();
      expect(screen.getByText(tr.generator.empty)).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(screen.queryByText(tr.generator.empty)).toBeNull();
      expect(screen.getByText(tr.common.regenerate)).toBeEnabled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("premium mod seçilince üretmez, paywall açar", async () => {
    mockParams = { id: "sayisal" };
    renderWithProviders(<GameScreen />);
    await settle();

    fireEvent.press(screen.getByText(tr.generator.modeBalanced));
    fireEvent.press(screen.getByText(tr.common.generate));
    await settle();

    expect(mockPush).toHaveBeenCalledWith("/paywall");
    // Kupon üretilmemiş olmalı.
    expect(screen.getByText(tr.generator.empty)).toBeTruthy();
  });

  it("kayan header'daki geri butonu önceki ekrana döner", async () => {
    mockParams = { id: "sayisal" };
    renderWithProviders(<GameScreen />);
    await settle();

    fireEvent.press(screen.getByLabelText(tr.common.back));
    expect(mockBack).toHaveBeenCalled();
  });

  it("bilinmeyen oyun id'sinde çökmez", async () => {
    mockParams = { id: "yok" };
    renderWithProviders(<GameScreen />);
    await settle();
    expect(screen.getByText(tr.common.notFound)).toBeTruthy();
  });

  it("Hızlı On'da adet seçici görünür", async () => {
    mockParams = { id: "hizli" };
    renderWithProviders(<GameScreen />);
    await settle();
    expect(screen.getByText(`${tr.generator.count}: 5`)).toBeTruthy();
  });
});

describe("İstatistik ekranı", () => {
  it("grafik, sıcak/soğuk listeler ve 'geçmiş ≠ gelecek' uyarısı gösterir", async () => {
    mockParams = { id: "sayisal" };
    renderWithProviders(<StatsScreen />);
    await settle();

    expect(screen.getByText(tr.statistics.disclaimer)).toBeTruthy();
    expect(screen.getAllByText(tr.statistics.hot).length).toBeGreaterThan(0);
    expect(screen.getAllByText(tr.statistics.cold).length).toBeGreaterThan(0);
    expect(screen.getByText(tr.statistics.sampleNote)).toBeTruthy();
  });

  it("bilinmeyen oyunda çökmez", async () => {
    mockParams = { id: "yok" };
    renderWithProviders(<StatsScreen />);
    await settle();
    expect(screen.getByText("—")).toBeTruthy();
  });
});

describe("Onboarding", () => {
  it("ilk slaytı gösterir ve son slaytta kabul butonu çıkar", async () => {
    renderWithProviders(<Onboarding />);
    await settle();

    expect(screen.getByText(tr.onboarding.s1Title)).toBeTruthy();
    expect(screen.getByText(tr.common.continue)).toBeTruthy();

    // "Atla" doğrudan son slayta götürür.
    fireEvent.press(screen.getByText(tr.onboarding.skip));
    await settle();
    expect(screen.getByText(tr.onboarding.accept)).toBeTruthy();
  });

  it("kabul edilince ana ekrana yönlendirir", async () => {
    renderWithProviders(<Onboarding />);
    await settle();

    fireEvent.press(screen.getByText(tr.onboarding.skip));
    await settle();
    fireEvent.press(screen.getByText(tr.onboarding.accept));
    await settle();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });
});

describe("Geçmiş ekranı", () => {
  it("boşken yönlendirici bir boş durum gösterir", async () => {
    renderWithProviders(<HistoryScreen />);
    await settle();
    expect(screen.getByText(tr.history.emptyTitle)).toBeTruthy();
    expect(screen.getByText(tr.history.goGenerate)).toBeTruthy();
  });
});

describe("Paywall", () => {
  it("mağaza yapılandırılmamışken bile beş faydayı ve yasal notu gösterir", async () => {
    renderWithProviders(<Paywall />);
    await settle();

    [
      tr.premium.benefit1,
      tr.premium.benefit2,
      tr.premium.benefit3,
      tr.premium.benefit4,
      tr.premium.benefit5,
    ].forEach((b) => expect(screen.getByText(b)).toBeTruthy());

    expect(screen.getByText(tr.premium.legalNote)).toBeTruthy();
    expect(screen.getByText(tr.settings.terms)).toBeTruthy();
    expect(screen.getByText(tr.settings.privacy)).toBeTruthy();
  });

  it("paket yoksa mağaza-kullanılamıyor mesajı verir (boş liste değil)", async () => {
    renderWithProviders(<Paywall />);
    await settle();
    await waitFor(() =>
      expect(screen.getByText(tr.premium.storeUnavailable)).toBeTruthy()
    );
  });
});

describe("Ayarlar", () => {
  it("dil, tema ve yasal bağlantıları listeler", async () => {
    renderWithProviders(<Settings />);
    await settle();

    expect(screen.getByText(tr.settings.language)).toBeTruthy();
    expect(screen.getByText(tr.settings.theme)).toBeTruthy();
    expect(screen.getByText(tr.settings.privacy)).toBeTruthy();
    expect(screen.getByText(tr.settings.terms)).toBeTruthy();
    expect(screen.getByText(tr.settings.responsible)).toBeTruthy();
    expect(screen.getByText(tr.settings.showOnboarding)).toBeTruthy();
  });

  it("sorumlu oyun metnini açar", async () => {
    renderWithProviders(<Settings />);
    await settle();

    fireEvent.press(screen.getByText(tr.settings.responsible));
    await settle();
    expect(screen.getByText(tr.disclaimer.responsibleBody)).toBeTruthy();
  });
});

describe("Hesap / giriş — auth yapılandırılmamış derleme", () => {
  it("hesap ekranı misafir durumunu gösterir", async () => {
    renderWithProviders(<Account />);
    await settle();
    expect(screen.getByText(tr.account.guestTitle)).toBeTruthy();
  });

  it("giriş ekranı kullanıcıyı kilitlemez, misafir çıkışı sunar", async () => {
    renderWithProviders(<SignIn />);
    await settle();

    expect(screen.getByText(tr.auth.unavailable)).toBeTruthy();
    expect(screen.getByText(tr.auth.continueAsGuest)).toBeTruthy();

    fireEvent.press(screen.getByText(tr.auth.continueAsGuest));
    expect(mockBack).toHaveBeenCalled();
  });

  it("kayıt ekranı da misafir çıkışı sunar ve çökmez", async () => {
    renderWithProviders(<SignUp />);
    await settle();
    expect(screen.getByText(tr.auth.signUpTitle)).toBeTruthy();
    expect(screen.getByText(tr.auth.continueAsGuest)).toBeTruthy();
  });

  it("şifre sıfırlama ekranı render olur", async () => {
    renderWithProviders(<ForgotPassword />);
    await settle();
    expect(screen.getByText(tr.auth.resetTitle)).toBeTruthy();
    expect(screen.getByText(tr.auth.sendReset)).toBeTruthy();
  });

  it("şifre sıfırlama, hesabın varlığını sızdırmadan onay verir", async () => {
    renderWithProviders(<ForgotPassword />);
    await settle();

    fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "a@b.co");
    fireEvent.press(screen.getByText(tr.auth.sendReset));
    await settle();

    // Auth yapılandırılmamış → "unavailable" hatası gösterilir, çökme olmaz.
    await waitFor(() =>
      expect(screen.getByText(tr.auth.error.unavailable)).toBeTruthy()
    );
  });
});
