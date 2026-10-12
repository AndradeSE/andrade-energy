const gerador =
  process.env.EXPO_PUBLIC_APP_VARIANT === "gerador";
const preview = process.env.EXPO_PUBLIC_APP_ENV === "preview";
// Production IA requires a new native APK; older production runtimes stay isolated.
const assistantNative = preview || process.env.EXPO_PUBLIC_ENABLE_GEMINI_LIVE === "1";
const variant = gerador ? "gerador" : "consumidor";
const packageId = `com.andradese.energy.${variant}${preview ? ".preview" : ""}`;
const scheme = `andradeenergy${variant}${preview ? "preview" : ""}`;
const icon = preview ? `./assets/images/android-icon-${variant}-preview.png` : `./assets/images/android-brand-${variant}.png`;

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
    name: `Andrade Energy ${gerador ? "Gerador" : "Consumidor"}${preview ? " Preview" : ""}`,

    slug: gerador
      ? "andrade-energy-gerador"
      : "andrade-energy",

    version: "1.0.0",

    orientation: "portrait",

    icon,

    scheme,

    // As telas do aplicativo (inclusive o carregamento inicial) usam a paleta clara.
    // Evita que o Android aplique o tema escuro apenas à janela nativa de abertura.
    userInterfaceStyle: "light",

    android: {
      userInterfaceStyle: "light",
      backgroundColor: "#DFE8E3",
      googleServicesFile: preview ? "./firebase/google-services-preview.json" : "./firebase/google-services.json",
      // Mantém o filtro de intent específico de cada APK. Sem isso, um
      // prebuild reutilizado pode acumular os dois schemes e o Android passa
      // a oferecer também o app Gerador ao abrir um convite de consumidor.
      scheme,

      package: packageId,

      versionCode: preview ? 2 : gerador ? 5 : 8,
      permissions: ["android.permission.REQUEST_INSTALL_PACKAGES", "android.permission.POST_NOTIFICATIONS", ...(assistantNative ? ["android.permission.RECORD_AUDIO"] : [])],

      predictiveBackGestureEnabled: false,

      softwareKeyboardLayoutMode: "resize",

      adaptiveIcon: {
        backgroundColor: preview ? (gerador ? "#FFFFFF" : "#020617") : "#EEF5F1",
        foregroundImage: icon,
      },
    },

    androidNavigationBar: {
      backgroundColor: "#F5F6F5",
      barStyle: "dark-content",
    },

    ios: {
      supportsTablet: true,

      bundleIdentifier: packageId,
      ...(assistantNative ? { infoPlist: { NSMicrophoneUsageDescription: "A conversa de voz pode enviar áudio ao Gemini Live após sua autorização." } } : {}),
    },

    web: {
      output: "static",

      favicon:
        "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      ...(assistantNative ? [["expo-audio", { microphonePermission: "A conversa de voz pode enviar áudio ao Gemini Live após sua autorização." }]] : []),
      ...(assistantNative ? [["react-native-audio-api", { iosBackgroundMode: false, androidForegroundService: false, androidPermissions: [], disableFFmpeg: true }]] : []),

      [
        "expo-splash-screen",
        {
          // A logo nativa usa a mesma arte da abertura animada do app.
          // Esta alteração exige um novo APK.
          image: "./assets/images/andrade-portal-logo-startup.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: preview ? "#DFE8E3" : "#EAF5EF",
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
            usesCleartextTraffic: false,
            ...(preview ? { buildArchs: ["arm64-v8a"] } : {}),
          },
        },
      ],
      ...(assistantNative ? [["llama.rn", { enableEntitlements: true, entitlementsProfile: "production", forceCxx20: true, enableOpenCL: false }], "expo-speech-recognition"] : []),
      "./plugins/with-variant-scheme",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      appEnvironment: preview ? "preview" : "production",
      appVariant: gerador
        ? "gerador"
        : "consumidor",

      router: {},

      eas: {
        projectId: easProjectId,
      },
    },

    runtimeVersion: preview ? "1.0.4-preview-live-awake" : assistantNative ? "1.0.4-production-live-awake" : {
      policy: "appVersion",
    },

    updates: {
      url: `https://u.expo.dev/${easProjectId}`,
      requestHeaders: { "expo-channel-name": `${preview ? "preview" : "production"}-${variant}` },
    },
  },
};
