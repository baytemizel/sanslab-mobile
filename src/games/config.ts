/**
 * Oyun tanımları / Game definitions
 *
 * Kurallar, kullanıcı tarafından sağlanan resmi kupon görsellerinden ve
 * millipiyangoonline.com kurallar sayfalarından doğrulanmıştır.
 * Rules verified from the official coupon screenshots and the operator's
 * rule pages.
 *
 * ÖNEMLİ / IMPORTANT:
 * Her çekiliş istatistiksel olarak bağımsızdır. Bu yapı yalnızca
 * kupon (kolon) sayıları ÜRETMEK içindir; kazanmayı garanti / tahmin etmez.
 * Each draw is statistically independent. This config is only for GENERATING
 * coupon numbers; it does not predict or guarantee winnings.
 */

export type PoolId = "main" | "joker" | "star";

export interface Pool {
  /** Pool identifier used for i18n labels & styling */
  id: PoolId;
  /** Inclusive lower bound */
  min: number;
  /** Inclusive upper bound */
  max: number;
  /** How many unique numbers to draw from this pool (fixed games) */
  count: number;
  /** Translation key for this pool's short label */
  labelKey: string;
}

export interface VariableCount {
  /** Which pool index has a user-selectable count */
  poolIndex: number;
  min: number;
  max: number;
  /** Default selected count */
  default: number;
}

export interface GameDef {
  /** Stable id, also used in routing /game/[id] */
  id: GameId;
  /** Translation key for the display name */
  nameKey: string;
  /** Brand color (hex) – mirrors the official coupon coloring */
  color: string;
  /** Secondary / light background tint */
  tint: string;
  /** Pools that make up one column (kolon) */
  pools: Pool[];
  /**
   * Hızlı On: the user first chooses how many numbers (1-10) to play.
   * When present, the referenced pool's `count` is overridden by user choice.
   */
  variableCount?: VariableCount;
  /** Whether this game is locked behind premium in the free tier */
  premiumOnly?: boolean;
  /** Short tagline translation key */
  taglineKey: string;
}

export type GameId =
  | "sayisal"
  | "super"
  | "sans"
  | "on"
  | "hizli";

export const GAMES: GameDef[] = [
  {
    // Çılgın Sayısal Loto: 6 ana sayı (1-90) + 1 Joker/SüperStar (1-90)
    // Kullanıcı tanımı: "6 ana kolon, 1 tane de Joker, her satırda 7 adet sayı, 1-90"
    id: "sayisal",
    nameKey: "games.sayisal.name",
    taglineKey: "games.sayisal.tagline",
    color: "#F5333B",
    tint: "#FDECEB",
    pools: [
      { id: "main", min: 1, max: 90, count: 6, labelKey: "pool.main" },
      { id: "joker", min: 1, max: 90, count: 1, labelKey: "pool.joker" },
    ],
  },
  {
    // Süper Loto: 6 sayı (1-60), Joker YOK
    id: "super",
    nameKey: "games.super.name",
    taglineKey: "games.super.tagline",
    color: "#FFA62B",
    tint: "#FEF3E2",
    pools: [{ id: "main", min: 1, max: 60, count: 6, labelKey: "pool.main" }],
  },
  {
    // Şans Topu: 1. bölüm 5 sayı (1-34) + 2. bölüm 1 sayı (1-14)
    id: "sans",
    nameKey: "games.sans.name",
    taglineKey: "games.sans.tagline",
    color: "#FF49A3",
    tint: "#FCE6F2",
    pools: [
      { id: "main", min: 1, max: 34, count: 5, labelKey: "pool.main" },
      { id: "star", min: 1, max: 14, count: 1, labelKey: "pool.star" },
    ],
  },
  {
    // On Numara: 10 sayı (1-80)
    id: "on",
    nameKey: "games.on.name",
    taglineKey: "games.on.tagline",
    color: "#9D62FF",
    tint: "#F1E7FA",
    pools: [{ id: "main", min: 1, max: 80, count: 10, labelKey: "pool.main" }],
  },
  {
    // Hızlı On: önce 1-10 arası adet seç, sonra o kadar sayı (1-80)
    id: "hizli",
    nameKey: "games.hizli.name",
    taglineKey: "games.hizli.tagline",
    color: "#6C8BFF",
    tint: "#ECE3F6",
    pools: [{ id: "main", min: 1, max: 80, count: 5, labelKey: "pool.main" }],
    variableCount: { poolIndex: 0, min: 1, max: 10, default: 5 },
  },
];

export const getGame = (id: string): GameDef | undefined =>
  GAMES.find((g) => g.id === id);
