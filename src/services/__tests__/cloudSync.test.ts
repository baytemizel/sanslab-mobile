/**
 * Bulut yedeği: diff/merge saf mantığı ve Firebase yokken no-op garantisi.
 */
import {
  deleteCloudHistory,
  diffHistory,
  isCloudSyncAvailable,
  mergeHistories,
  pullHistory,
  pushHistoryChanges,
} from "../cloudSync";
import type { SavedCoupon } from "../../state/history";

const c = (uid: string, createdAt: number, extra: Partial<SavedCoupon> = {}): SavedCoupon => ({
  uid,
  gameId: "sayisal",
  pools: [],
  mode: "random",
  createdAt,
  favorite: false,
  ...extra,
});

describe("diffHistory", () => {
  it("yeni kuponları yazar, çıkarılanları siler", () => {
    const prev = [c("a", 1), c("b", 2)];
    const next = [c("c", 3), c("a", 1)];
    const d = diffHistory(prev, next);
    expect(d.upserts.map((x) => x.uid)).toEqual(["c"]);
    expect(d.deletes).toEqual(["b"]);
  });

  it("favori ve not değişikliğini günceller, değişmeyeni yazmaz", () => {
    const prev = [c("a", 1), c("b", 2)];
    const next = [c("a", 1, { favorite: true }), c("b", 2)];
    expect(diffHistory(prev, next)).toEqual({ upserts: [next[0]], deletes: [] });
    expect(diffHistory(next, next)).toEqual({ upserts: [], deletes: [] });
  });
});

describe("mergeHistories", () => {
  it("iki tarafı birleştirir, yeniden eskiye sıralar", () => {
    const merged = mergeHistories([c("local", 3)], [c("remote", 5), c("old", 1)]);
    expect(merged.map((x) => x.uid)).toEqual(["remote", "local", "old"]);
  });

  it("aynı kupon iki taraftaysa cihazdaki sürüm kazanır", () => {
    const merged = mergeHistories(
      [c("a", 1, { favorite: false, note: "cihaz" })],
      [c("a", 1, { favorite: true, note: "bulut" })]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].note).toBe("cihaz");
  });
});

describe("Firebase yapılandırılmamış derleme", () => {
  it("bulut yedeği sessizce devre dışıdır, fırlatmaz", async () => {
    expect(isCloudSyncAvailable()).toBe(false);
    await expect(pullHistory("u1")).resolves.toBeNull();
    expect(() => pushHistoryChanges("u1", [], [c("a", 1)])).not.toThrow();
    await expect(deleteCloudHistory("u1")).resolves.toBeUndefined();
  });
});
