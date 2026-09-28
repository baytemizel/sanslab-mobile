import {
  prependToHistory,
  addToHistory,
  countFavorites,
  filterHistory,
  pruneHistory,
  removeFromHistory,
  toggleFavorite,
  type SavedCoupon,
} from "../history";
import type { Coupon } from "../../games/generator";
import { FREE_HISTORY_LIMIT, PREMIUM_HISTORY_LIMIT } from "../../premium/gates";

const FREE = { isPremium: false };
const PREMIUM = { isPremium: true };

function coupon(uid: string, gameId = "sayisal"): Coupon {
  return {
    uid,
    gameId,
    mode: "random",
    createdAt: 0,
    pools: [
      { id: "main", labelKey: "pool.main", numbers: [1, 2, 3], min: 1, max: 90 },
    ],
  };
}

function saved(uid: string, favorite = false, gameId = "sayisal"): SavedCoupon {
  return { ...coupon(uid, gameId), favorite };
}

describe("addToHistory", () => {
  it("yeni kuponları listenin başına ekler", () => {
    const list = addToHistory([saved("old")], [coupon("new")], FREE);
    expect(list.map((c) => c.uid)).toEqual(["new", "old"]);
    expect(list[0].favorite).toBe(false);
  });

  it("çoklu üretimde tüm satırları sırasıyla ekler", () => {
    const list = addToHistory([], [coupon("a"), coupon("b"), coupon("c")], FREE);
    expect(list.map((c) => c.uid)).toEqual(["a", "b", "c"]);
  });

  it("free katmanda limiti aşmaz", () => {
    const incoming = Array.from({ length: FREE_HISTORY_LIMIT + 5 }, (_, i) =>
      coupon(`c${i}`)
    );
    const list = addToHistory([], incoming, FREE);
    expect(list).toHaveLength(FREE_HISTORY_LIMIT);
    // en yeniler tutulur
    expect(list[0].uid).toBe("c0");
  });

  it("premium katmanda çok daha fazlasını tutar", () => {
    const incoming = Array.from({ length: FREE_HISTORY_LIMIT + 20 }, (_, i) =>
      coupon(`c${i}`)
    );
    const list = addToHistory([], incoming, PREMIUM);
    expect(list).toHaveLength(FREE_HISTORY_LIMIT + 20);
    expect(list.length).toBeLessThanOrEqual(PREMIUM_HISTORY_LIMIT);
  });
});

describe("pruneHistory", () => {
  it("favorileri ASLA silmez, limitin üstünde olsalar bile", () => {
    const favorites = Array.from({ length: FREE_HISTORY_LIMIT + 3 }, (_, i) =>
      saved(`f${i}`, true)
    );
    const list = pruneHistory(favorites, FREE);
    expect(list).toHaveLength(favorites.length);
    expect(list.every((c) => c.favorite)).toBe(true);
  });

  it("favoriler limiti doldurduğunda favori olmayanları atar", () => {
    const list = pruneHistory(
      [
        ...Array.from({ length: FREE_HISTORY_LIMIT }, (_, i) => saved(`f${i}`, true)),
        saved("plain"),
      ],
      FREE
    );
    expect(list.find((c) => c.uid === "plain")).toBeUndefined();
    expect(list).toHaveLength(FREE_HISTORY_LIMIT);
  });

  it("orijinal sırayı korur", () => {
    const list = pruneHistory(
      [saved("a"), saved("b", true), saved("c")],
      PREMIUM
    );
    expect(list.map((c) => c.uid)).toEqual(["a", "b", "c"]);
  });

  it("premium'dan free'ye düşünce budar ama favorileri korur", () => {
    const big = [
      saved("fav", true),
      ...Array.from({ length: 30 }, (_, i) => saved(`c${i}`)),
    ];
    const list = pruneHistory(big, FREE);
    expect(list).toHaveLength(FREE_HISTORY_LIMIT);
    expect(list.find((c) => c.uid === "fav")).toBeDefined();
  });
});

describe("toggleFavorite / removeFromHistory / countFavorites", () => {
  it("favori durumunu tersine çevirir", () => {
    const list = toggleFavorite([saved("a")], "a");
    expect(list[0].favorite).toBe(true);
    expect(toggleFavorite(list, "a")[0].favorite).toBe(false);
  });

  it("bilinmeyen uid listeyi değiştirmez", () => {
    const before = [saved("a")];
    expect(toggleFavorite(before, "zzz")).toEqual(before);
  });

  it("kuponu siler", () => {
    expect(removeFromHistory([saved("a"), saved("b")], "a").map((c) => c.uid)).toEqual([
      "b",
    ]);
  });

  it("favori sayısını doğru sayar", () => {
    expect(countFavorites([saved("a", true), saved("b"), saved("c", true)])).toBe(2);
  });
});

describe("filterHistory", () => {
  const list = [
    saved("a", true, "sayisal"),
    saved("b", false, "super"),
    saved("c", true, "super"),
  ];

  it("filtresiz her şeyi döner", () => {
    expect(filterHistory(list, {})).toHaveLength(3);
  });

  it("oyuna göre filtreler", () => {
    expect(filterHistory(list, { gameId: "super" }).map((c) => c.uid)).toEqual([
      "b",
      "c",
    ]);
  });

  it("yalnızca favorileri döner", () => {
    expect(filterHistory(list, { favoritesOnly: true }).map((c) => c.uid)).toEqual([
      "a",
      "c",
    ]);
  });

  it("oyun + favori birlikte çalışır", () => {
    expect(
      filterHistory(list, { gameId: "super", favoritesOnly: true }).map((c) => c.uid)
    ).toEqual(["c"]);
  });
});

describe("prependToHistory", () => {
  it("yeni kuponları başa ekler, budamaz (Premium durumu bilinmiyorken)", () => {
    const list = Array.from({ length: 12 }, (_, i) => ({
      uid: `old${i}`,
      gameId: "sayisal",
      pools: [],
      mode: "random" as const,
      createdAt: i,
      favorite: false,
    }));
    const next = prependToHistory(list, [
      { uid: "new", gameId: "sayisal", pools: [], mode: "random", createdAt: 99 },
    ]);
    expect(next).toHaveLength(13);
    expect(next[0]).toMatchObject({ uid: "new", favorite: false });
  });
});
