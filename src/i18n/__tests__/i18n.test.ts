/**
 * Çeviri bütünlüğü.
 *
 * Eksik bir anahtar üretimde kullanıcıya ham `premium.benefit3` gibi bir metin
 * gösterir. Bu test onu derlemeden önce yakalar.
 */
import fs from "fs";
import path from "path";

import tr from "../tr";
import en from "../en";

function flatten(obj: any, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === "object" ? flatten(v, key) : [key];
  });
}

const trKeys = flatten(tr).sort();
const enKeys = flatten(en).sort();

/** Kaynak kodda `t("...")` ile çağrılan anahtarlar. */
function usedKeys(): Set<string> {
  const root = path.resolve(__dirname, "../../..");
  const dirs = [path.join(root, "app"), path.join(root, "src")];
  const files: string[] = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__" && entry.name !== "node_modules") walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        files.push(full);
      }
    }
  };
  dirs.forEach(walk);

  const keys = new Set<string>();
  const patterns = [
    /\bt\(\s*"([a-zA-Z0-9_.-]+)"/g, // t("a.b")
    /\bt\(\s*`([a-zA-Z0-9_.-]+)`/g, // t(`a.b`)
    /"(premium\.benefit\d)"/g, // gates.ts sabitleri
  ];

  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) keys.add(m[1]);
    }
  }
  return keys;
}

describe("i18n", () => {
  it("tr ve en aynı anahtar kümesine sahiptir", () => {
    expect(trKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
    expect(enKeys.filter((k) => !trKeys.includes(k))).toEqual([]);
  });

  it("hiçbir çeviri boş değildir", () => {
    const empties: string[] = [];
    const check = (obj: any, prefix = "") => {
      Object.entries(obj).forEach(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object") check(v, key);
        else if (typeof v !== "string" || v.trim() === "") empties.push(key);
      });
    };
    check(tr);
    check(en);
    expect(empties).toEqual([]);
  });

  it("kodda kullanılan her anahtarın karşılığı vardır", () => {
    // Dinamik anahtarlar (t(`auth.error.${code}`)) statik olarak çözülemez;
    // bunlar için kök var mı diye bakarız.
    const dynamicRoots = ["auth.error", "games.", "pool."];
    const missing = [...usedKeys()].filter((key) => {
      if (trKeys.includes(key)) return false;
      return !dynamicRoots.some((root) => key.startsWith(root));
    });
    expect(missing).toEqual([]);
  });

  it("her auth hata kodu için mesaj vardır", () => {
    const codes = [
      "invalid-email",
      "user-not-found",
      "wrong-password",
      "email-already-in-use",
      "weak-password",
      "too-many-requests",
      "network",
      "cancelled",
      "requires-recent-login",
      "unavailable",
      "unknown",
      "terms",
    ];
    codes.forEach((c) => {
      expect(trKeys).toContain(`auth.error.${c}`);
      expect(enKeys).toContain(`auth.error.${c}`);
    });
  });

  it("yerleştirme (interpolation) değişkenleri iki dilde eşleşir", () => {
    const vars = (s: string) =>
      [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    const get = (obj: any, key: string) =>
      key.split(".").reduce((o: any, k) => o?.[k], obj);

    trKeys.forEach((key) => {
      const a = get(tr, key);
      const b = get(en, key);
      if (typeof a === "string" && typeof b === "string") {
        expect({ key, vars: vars(a) }).toEqual({ key, vars: vars(b) });
      }
    });
  });

  it("dürüstlük beyanı metinleri korunur (yasal/etik gereklilik)", () => {
    // Bu ifadeler mağaza incelemesi ve etik çerçeve için ZORUNLUDUR.
    expect(tr.generator.modeLowShareDesc).toMatch(/ARTIRMAZ/);
    expect(tr.generator.modeFormulaDesc).toMatch(/artırmaz/);
    expect(en.generator.modeLowShareDesc).toMatch(/does NOT improve/i);
    expect(tr.disclaimer.short).toMatch(/garanti etmez/);
    expect(tr.onboarding.s4Body).toMatch(/18 yaşından küçükler/);
  });
});
