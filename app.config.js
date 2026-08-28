const gerador =
  process.env.EXPO_PUBLIC_APP_VARIANT === "gerador";

const consumerProjectId =
  "45f35f6f-4f6a-4452-b2e4-02932e778b2b";

const generatorProjectId =
  "fb9568d6-9bf0-4c1c-b30f-6ea034b90655";

const easProjectId =
  gerador
    ? generatorProjectId
    : consumerProjectId;

module.exports = {
  expo: {
    name: gerador
      ? "Andrade Energy Gerador"
      : "Andrade Energy Consumidor",

    slug: gerador
      ? "andrade-energy-gerador"
      : "andrade-energy",

    version: "1.0.0",

    orientation: "portrait",

    icon: gerador
      ? "./assets/images/android-icon-gerador-safe.png"
      : "./assets/images/android-icon-consumidor-safe.png",

    scheme: gerador
      ? "andradeenergygerador"
      : "andradeenergyconsumidor",

    userInterfaceStyle: "automatic",

    android: {
      package: gerador
        ? "com.andradese.energy.gerador"
        : "com.andradese.energy.consumidor",

      predictiveBackGestureEnabled: false,

      softwareKeyboardLayoutMode: "resize",

      adaptiveIcon: {
        backgroundColor: gerador ? "#FFFFFF" : "#020617",
        foregroundImage: gerador
          ? "./assets/images/android-icon-gerador-safe.png"
          : "./assets/images/android-icon-consumidor-safe.png",
      },
    },

    androidNavigationBar: {
      backgroundColor: "#F5F6F5",
      barStyle: "dark-content",
    },

    ios: {
      supportsTablet: true,

      bundleIdentifier: gerador
        ? "com.andradese.energy.gerador"
        : "com.andradese.energy.consumidor",
    },

    web: {
      output: "static",

      favicon:
        "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",

      [
        "expo-splash-screen",
        {
          // A imagem enviada já traz a logo Andrade Energy. Não há ícone
          // adicional nesta tela de abertura.
          image: "./assets/images/usina-loading.jpeg",
          imageWidth: 390,
          resizeMode: "cover",
          backgroundColor: "#F5F6F5",
        },
      ],

      "expo-secure-store",

      "expo-local-authentication",

      [
        "expo-notifications",
        {
          color: "#079454",
          defaultChannel: "carteira",
        },
      ],

      [
        "expo-web-browser",
        {
          experimentalLauncherActivity: true,
        },
      ],

      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      appVariant: gerador
        ? "gerador"
        : "consumidor",

      router: {},

      eas: {
        projectId: easProjectId,
      },
    },

    runtimeVersion: {
      policy: "appVersion",
    },

    updates: {
      url: `https://u.expo.dev/${easProjectId}`,
      requestHeaders: {
        "expo-channel-name": gerador
          ? "preview-gerador"
          : "preview-consumidor",
      },
    },
  },
};
