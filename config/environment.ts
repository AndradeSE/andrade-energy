import * as Updates from "expo-updates";

export const PREVIEW_API_URL = "https://andrade-energy-api-homologacao.onrender.com/api";
export const PRODUCTION_API_URL = "https://andrade-energy-api-vda.onrender.com/api";

// The native build channel is stable across OTA updates. Never let an OTA
// variable or a missing .env silently send a Preview APK to production.
const channel = Updates.channel ?? "";
export const isPreviewEnvironment = channel.startsWith("preview-") ||
  (!channel && /andrade-energy-api-homologacao\.onrender\.com/i.test(process.env.EXPO_PUBLIC_API_URL ?? ""));

export const environmentKeySuffix = isPreviewEnvironment ? "_preview" : "";
// Never enable native IA through an OTA variable on an older production APK.
export const isAssistantEnabled = isPreviewEnvironment ||
  Updates.runtimeVersion === "1.0.4-production-live-awake";
export const environmentApiUrl = isPreviewEnvironment
  ? PREVIEW_API_URL
  : channel
    ? PRODUCTION_API_URL
    : process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;
