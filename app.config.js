const gerador = process.env.EXPO_PUBLIC_APP_VARIANT === "gerador";
const consumerProjectId = "45f35f6f-4f6a-4452-b2e4-02932e778b2b";
const generatorProjectId = "fb9568d6-9bf0-4c1c-b30f-6ea034b90655";
const easProjectId = gerador ? generatorProjectId : consumerProjectId;

module.exports = {
  expo: {
    name: gerador ? "Andrade Energy Gerador" : "Andrade Energy Consumidor",
    slug: gerador ? "andrade-energy-gerador" : "andrade-energy",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/android-icon-foreground.png",
    scheme: gerador ? "andradeenergygerador" : "andradeenergyconsumidor",
    userInterfaceStyle: "automatic",
    android: {
      package: gerador ? "com.andradese.energy.gerador" : "com.andradese.energy.consumidor",
      predictiveBackGestureEnabled: false,
      adaptiveIcon: {
        backgroundColor: "#020617",
        foregroundImage: "./assets/images/android-icon-foreground.png",
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: gerador ? "com.andradese.energy.gerador" : "com.andradese.energy.consumidor",
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      ["expo-splash-screen", {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#020617",
      }],
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      appVariant: gerador ? "gerador" : "consumidor",
      router: {},
      eas: { projectId: easProjectId },
    },
    runtimeVersion: { policy: "appVersion" },
    updates: { url: `https://u.expo.dev/${easProjectId}` },
  },
};
