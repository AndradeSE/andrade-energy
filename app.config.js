const base = require("./app.json").expo;

const gerador = process.env.EXPO_PUBLIC_APP_VARIANT === "gerador";

module.exports = {
  expo: {
    ...base,
    name: gerador ? "Andrade Energy Gerador" : "Andrade Energy Consumidor",
    slug: gerador ? "andrade-energy-gerador" : "andrade-energy-consumidor",
    scheme: gerador ? "andradeenergygerador" : "andradeenergyconsumidor",
    android: {
      ...base.android,
      package: gerador ? "com.andradese.energy.gerador" : "com.andradese.energy.consumidor",
    },
    ios: {
      ...base.ios,
      bundleIdentifier: gerador ? "com.andradese.energy.gerador" : "com.andradese.energy.consumidor",
    },
    extra: {
      ...base.extra,
      appVariant: gerador ? "gerador" : "consumidor",
      ...(gerador ? { eas: undefined } : {}),
    },
    ...(gerador ? { updates: undefined } : {}),
  },
};
