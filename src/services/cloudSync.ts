/**
 * Kupon geçmişinin Firestore yedeği / Cloud backup of coupon history
 *
 * Cihaz (AsyncStorage) ASIL kaynaktır: ekran her zaman yerel veriyi okur ve
 * yazma önce cihaza yapılır. Giriş yapmış kullanıcıda değişiklikler Firestore'a
 * ARKA PLANDA, beklenmeden gönderilir; Firestore'un çevrimdışı kalıcılığı
 * yazmaları kuyruğa alır ve ağ gelince iletir. Cihaz sıfırlanır ya da
 * değişirse girişte buluttaki geçmiş cihazdakiyle birleştirilir.
 *
 * Yapı: users/{uid}/coupons/{couponUid} — her kupon bir doküman ((default)
 * veritabanı). Misafirde hiçbir şey gönderilmez; Firebase yoksa her şey no-op.
 * Güvenlik kuralları: repo kökündeki `firestore.rules`.
 */
import { firebaseEnabled } from "./env";
import { sanitizeHistory, type SavedCoupon } from "../state/history";

/* ----------------------- Tembel modül yükleme ----------------------- */

let _fs: any | null = null;
let _unavailable = false;

function firestoreApi(): any | null {
  if (_unavailable) return null;
  if (_fs) return _fs;
  if (!firebaseEnabled) {
    _unavailable = true;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _fs = require("@react-native-firebase/firestore");
    _fs.getFirestore();
    return _fs;
  } catch (e) {
    if (__DEV__) console.warn("[sync] Firestore kullanılamıyor:", e);
    _unavailable = true;
    _fs = null;
    return null;
  }
}

export function isCloudSyncAvailable(): boolean {
  return firestoreApi() !== null;
}

/* --------------------------- Saf yardımcılar --------------------------- */

export interface HistoryDiff {
  upserts: SavedCoupon[];
  deletes: string[];
}

/** `prev` → `next` geçişinde buluta yazılması gereken değişiklikler. */
export function diffHistory(prev: SavedCoupon[], next: SavedCoupon[]): HistoryDiff {
  const before = new Map(prev.map((c) => [c.uid, c]));
  const upserts = next.filter((c) => {
    const old = before.get(c.uid);
    return !old || old.favorite !== c.favorite || old.note !== c.note;
  });
  const keep = new Set(next.map((c) => c.uid));
  const deletes = prev.filter((c) => !keep.has(c.uid)).map((c) => c.uid);
  return { upserts, deletes };
}

/**
 * Cihazdaki ve buluttaki geçmişi birleştirir. Aynı kupon iki tarafta da varsa
 * cihazdaki sürüm kazanır (cihaz asıl kaynaktır). Sonuç yeniden eskiye sıralı.
 */
export function mergeHistories(
  local: SavedCoupon[],
  remote: SavedCoupon[]
): SavedCoupon[] {
  const byUid = new Map<string, SavedCoupon>();
  for (const c of remote) byUid.set(c.uid, c);
  for (const c of local) byUid.set(c.uid, c);
  return [...byUid.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/* ------------------------------- G/Ç ------------------------------- */

/** Firestore: batch başına en fazla 500 işlem. */
const BATCH_LIMIT = 450;
/** Hesap silme gibi beklenen işlemlerde çevrimdışı takılmayı önler. */
const AWAIT_TIMEOUT_MS = 15000;

function couponsRef(api: any, uid: string) {
  return api.collection(api.getFirestore(), "users", uid, "coupons");
}

/** Firestore `undefined` alan kabul etmez; JSON'a uygun temiz kopya. */
function toDoc(c: SavedCoupon): Record<string, unknown> {
  return JSON.parse(JSON.stringify(c));
}

async function writeInBatches(
  api: any,
  uid: string,
  { upserts, deletes }: HistoryDiff
): Promise<void> {
  const col = couponsRef(api, uid);
  const ops: ((batch: any) => void)[] = [
    ...upserts.map((c) => (b: any) => b.set(api.doc(col, c.uid), toDoc(c))),
    ...deletes.map((id) => (b: any) => b.delete(api.doc(col, id))),
  ];
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = api.writeBatch(api.getFirestore());
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
    await batch.commit();
  }
  if (__DEV__) {
    console.log(`[sync] ${upserts.length} kupon yazıldı, ${deletes.length} silindi`);
  }
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), AWAIT_TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/** Buluttaki geçmişi okur; Firebase yoksa ya da okuma başarısızsa `null`. */
export async function pullHistory(uid: string): Promise<SavedCoupon[] | null> {
  const api = firestoreApi();
  if (!api) return null;
  try {
    const snap = await api.getDocs(couponsRef(api, uid));
    return sanitizeHistory(snap.docs.map((d: any) => d.data()));
  } catch (e) {
    if (__DEV__) console.warn("[sync] okuma başarısız:", e);
    return null;
  }
}

/**
 * Değişiklikleri buluta ARKA PLANDA yazar: beklenmez, hata uygulamayı
 * etkilemez (Firestore çevrimdışıyken kuyruğa alır).
 */
export function pushHistoryChanges(
  uid: string,
  prev: SavedCoupon[],
  next: SavedCoupon[]
): void {
  const api = firestoreApi();
  if (!api) return;
  const diff = diffHistory(prev, next);
  if (!diff.upserts.length && !diff.deletes.length) return;
  writeInBatches(api, uid, diff).catch((e) => {
    if (__DEV__) console.warn("[sync] yazma başarısız:", e);
  });
}

/**
 * Hesap silinirken buluttaki tüm kuponları siler. Güvenlik kuralları gereği
 * hesap silinmeden ÖNCE çağrılmalı; başarısız olursa fırlatır ki hesap
 * verisi bulutta sahipsiz kalmasın.
 */
export async function deleteCloudHistory(uid: string): Promise<void> {
  const api = firestoreApi();
  if (!api) return;
  const snap = await withTimeout(api.getDocs(couponsRef(api, uid)) as Promise<any>);
  const ids: string[] = snap.docs.map((d: any) => d.id);
  if (!ids.length) return;
  await withTimeout(writeInBatches(api, uid, { upserts: [], deletes: ids }));
}
