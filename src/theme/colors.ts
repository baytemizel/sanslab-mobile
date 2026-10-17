/**
 * ŞansLab — "Gece Çekilişi / Night Draw" görsel kimliği.
 * Derin gece-laciverdi tuval, sıcak altın şans vurgusu, parlayan çekiliş topları.
 * Açık tema = sıcak krem "Gündüz Çekilişi" varyantı; aynı altın + top dili.
 */

export const palette = {
  // Lucky gold — both themes share it
  gold: "#F4C04A",
  goldDeep: "#E0A02E",
  goldBright: "#FFD876",

  // Night (dark, primary identity)
  inkTop: "#161334",
  inkBottom: "#0A0918",
  velvet: "#1C1947",
  velvetHi: "#2A2660",
  cloud: "#F4F2FF",
  mist: "#A9A3D6",
  lineDark: "rgba(255,255,255,0.09)",

  // Day (light)
  creamTop: "#FBF8F0",
  creamBottom: "#F2ECDC",
  cardLight: "#FFFFFF",
  inkText: "#1A1633",
  subLight: "#6A6388",
  lineLight: "#ECE4D2",
  goldOnLight: "#B7841F",

  white: "#FFFFFF",
  success: "#22C079",
  danger: "#F5333B",
};

/** Vibrant per-game colors — readable & glowing on both canvases. */
export const gameColors = {
  sayisal: "#F5333B",
  super: "#FFA62B",
  sans: "#FF49A3",
  on: "#9D62FF",
  hizli: "#6C8BFF",
};

export interface Theme {
  dark: boolean;
  // gradient stops for the ambient backdrop
  gradTop: string;
  gradBottom: string;
  glow: string;        // radial glow color (top center)
  bg: string;          // flat fallback bg
  card: string;        // glass card fill
  cardSolid: string;
  text: string;
  subText: string;
  border: string;
  hairline: string;
  gold: string;        // accent that reads on this bg
  goldFill: string;    // for gold buttons (always warm gold)
  onGold: string;      // text on gold
  ballFace: string;    // ball background
  ballGlow: number;    // glow opacity multiplier
}

export const darkTheme: Theme = {
  dark: true,
  gradTop: palette.inkTop,
  gradBottom: palette.inkBottom,
  glow: "rgba(244,192,74,0.18)",
  bg: palette.inkBottom,
  card: "rgba(255,255,255,0.05)",
  cardSolid: palette.velvet,
  text: palette.cloud,
  subText: palette.mist,
  border: "rgba(255,255,255,0.10)",
  hairline: palette.lineDark,
  gold: palette.goldBright,
  goldFill: palette.gold,
  onGold: "#241A05",
  ballFace: "#0E0C24",
  ballGlow: 1,
};

export const lightTheme: Theme = {
  dark: false,
  gradTop: palette.creamTop,
  gradBottom: palette.creamBottom,
  glow: "rgba(244,192,74,0.22)",
  bg: palette.creamTop,
  card: "#FFFFFF",
  cardSolid: "#FFFFFF",
  text: palette.inkText,
  subText: palette.subLight,
  border: palette.lineLight,
  hairline: palette.lineLight,
  gold: palette.goldOnLight,
  goldFill: palette.gold,
  onGold: "#241A05",
  ballFace: "#FFFFFF",
  ballGlow: 0.35,
};

export const fonts = {
  display: "Sora_700Bold",
  displayHeavy: "Sora_800ExtraBold",
  ball: "Sora_700Bold",
  body: "Inter_400Regular",
  bodyMed: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  /** "Premium" markası: zarif serif italik. */
  premium: "PlayfairDisplay_800ExtraBold_Italic",
};

export const spacing = (n: number) => n * 8;
export const radius = { sm: 12, md: 18, lg: 26, xl: 32, pill: 999 };
