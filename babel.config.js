module.exports = function (api) {
  // Test ile uygulama derlemesi farklı çıktı ürettiği için cache anahtarı env'e bağlı.
  api.cache.using(() => process.env.NODE_ENV);

  const isTest = process.env.NODE_ENV === "test";

  return {
    presets: ["babel-preset-expo"],
    plugins: isTest
      ? [
          /**
           * React Native'in kendi Jest bileşen taklitleri (`jest/mockComponent`)
           * `RealComponent.prototype.constructor` okur. babel-preset-expo, Hermes
           * hedeflediği için ok fonksiyonlarını olduğu gibi bırakır ve ok
           * fonksiyonlarının `prototype`'ı yoktur → Text/View/ScrollView taklitleri
           * çöker. Yalnızca test ortamında ok fonksiyonlarını klasik fonksiyona
           * çevirerek RN'in kendi Jest kurulumuyla uyumlu hale geliyoruz.
           */
          "@babel/plugin-transform-arrow-functions",
        ]
      : [],
  };
};
