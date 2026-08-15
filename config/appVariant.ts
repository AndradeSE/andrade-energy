import Constants from "expo-constants";

export type AppVariant = "consumidor" | "gerador";

export const APP_VARIANT: AppVariant =
  Constants.expoConfig?.extra?.appVariant === "gerador" ? "gerador" : "consumidor";

export const IS_GERADOR_APP = APP_VARIANT === "gerador";
export const APP_DISPLAY_NAME = IS_GERADOR_APP
  ? "Andrade Energy Gerador"
  : "Andrade Energy Consumidor";
