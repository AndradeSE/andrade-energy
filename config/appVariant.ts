import Constants from "expo-constants";

export type AppVariant = "consumidor" | "gerador";

export const APP_VARIANT: AppVariant =
  Constants.expoConfig?.extra?.appVariant === "gerador" ? "gerador" : "consumidor";

export const IS_GERADOR_APP = APP_VARIANT === "gerador";
// Mantém o conector preparado, mas fora da interface enquanto não houver
// credenciais oficiais de uma plataforma de monitoramento para validação.
export const INVERTER_INTEGRATIONS_ENABLED = false;
export const APP_DISPLAY_NAME = IS_GERADOR_APP
  ? "Andrade Energy Gerador"
  : "Andrade Energy Consumidor";
