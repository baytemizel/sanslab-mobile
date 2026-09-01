// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

/** Jest global'leri — flat config'te `env` yerine açıkça tanımlanır. */
const JEST_GLOBALS = {
  jest: "readonly",
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  beforeAll: "readonly",
  beforeEach: "readonly",
  afterAll: "readonly",
  afterEach: "readonly",
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "node_modules/**",
      "android/**",
      "ios/**",
      "dist/**",
      ".expo/**",
      "web-demo/**",
      "landing/**",
      "store/**",
      "docs/**",
      "coverage/**",
    ],
  },
  {
    rules: {
      // Üretim kodunda uyarı/hata dışında konsol çıktısı istemiyoruz.
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Servis sarmalayıcıları ve build config'i bilinçli olarak konsola yazar.
    files: ["src/services/**/*.ts", "app.config.ts"],
    rules: { "no-console": "off" },
  },
  {
    // i18next örneği üzerinden `use`/`changeLanguage` çağırmak kasıtlıdır.
    files: ["src/i18n/index.ts"],
    rules: { "import/no-named-as-default-member": "off" },
  },
  {
    files: [
      "**/__tests__/**/*.{ts,tsx}",
      "**/*.test.{ts,tsx}",
      "src/test/**/*.{ts,tsx}",
      "jest.setup.js",
    ],
    languageOptions: { globals: JEST_GLOBALS },
    rules: { "no-console": "off" },
  },
]);
