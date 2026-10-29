import * as Updates from "expo-updates";
import * as Application from "expo-application";

export const PREVIEW_API_URL = "https://andrade-energy-api-homologacao.onrender.com/api";
export const PRODUCTION_API_URL = "https://andrade-energy-api-vda.onrender.com/api";

// The native build channel is stable across OTA updates. Never let an OTA
// variable or a missing .env silently send a Preview APK to production.
const channel = Updates.channel ?? "";
export const isPreviewEnvironment = (Application.applicationId?.endsWith(".preview") ?? false) || channel.startsWith("preview-") ||
  (!channel && /andrade-energy-api-homologacao\.onrender\.com/i.test(process.env.EXPO_PUBLIC_API_URL ?? ""));

export const environmentKeySuffix = isPreviewEnvironment ? "_preview" : "";
// Never enable native IA through an OTA variable on an older production APK.
export const isAssistantEnabled = isPreviewEnvironment ||
  Updates.runtimeVersion === "1.0.4-production-live-awake" ||
  Updates.runtimeVersion === "1.0.7-production-cemig-flow" ||
  Updates.runtimeVersion === "1.0.9-production-cemig-worker" ||
  Updates.runtimeVersion === "1.0.8-production-cemig-vault";
// Native audio support belongs to the installed runtime, not OTA export flags.
export const supportsAssistantLive = Updates.runtimeVersion === "1.0.4-preview-live-awake" ||
  Updates.runtimeVersion === "1.0.5-preview-cemig-browser" ||
  Updates.runtimeVersion === "1.0.6-preview-cemig-csv" ||
  Updates.runtimeVersion === "1.0.7-preview-cemig-flow" ||
  Updates.runtimeVersion === "1.0.7-production-cemig-flow" ||
  Updates.runtimeVersion === "1.0.8-preview-cemig-vault" ||
  Updates.runtimeVersion === "1.0.9-preview-cemig-worker" ||
  Updates.runtimeVersion === "1.0.9-production-cemig-worker" ||
  Updates.runtimeVersion === "1.0.8-production-cemig-vault" ||
  Updates.runtimeVersion === "1.0.4-production-live-awake" ||
  (!Updates.runtimeVersion && process.env.EXPO_PUBLIC_ENABLE_GEMINI_LIVE === "1");
export const environmentApiUrl = isPreviewEnvironment
  ? PREVIEW_API_URL
  : channel
    ? PRODUCTION_API_URL
    : process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;
