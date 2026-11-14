import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { APP_DISPLAY_NAME, IS_GERADOR_APP } from "../config/appVariant";
import releases from "../config/ota-release-history.json";

const preview = Constants.expoConfig?.extra?.appEnvironment === "preview" || Updates.channel?.startsWith("preview");
const variant = IS_GERADOR_APP ? "gerador" : "consumidor";
export const appReleaseNotes = releases.filter(item =>
  item.variant === variant && (item.audience === "all" || item.audience === (preview ? "internal" : "clients"))
);

export function appReleaseSummary(history: boolean) {
  const revision = Updates.updateId?.slice(-8) ?? "incluída no instalador";
  const version = Constants.expoConfig?.version ?? "não informada";
  const runtimeTag = /\[(1\.\d+\.\d+-[^\]]+)\]\s*$/;
  const notes = appReleaseNotes.filter(item => item.melhorias.every(change => {
    const taggedRuntime = change.match(runtimeTag)?.[1];
    return !taggedRuntime || taggedRuntime === Updates.runtimeVersion;
  }));
  const details = (history ? notes.slice(0, 4) : notes.slice(0, 1)).map(item =>
    [item.numero + " · " + item.data, ...item.melhorias.map(change => "• " + change.replace(runtimeTag, "").trim())].join("\n")
  );
  return [
    APP_DISPLAY_NAME + " · " + (preview ? "Preview" : "Produção"),
    "Versão " + version + " · Revisão " + revision,
    details.length ? "Notas incluídas nesta versão:" : "Esta instalação não tem notas de atualização registradas.",
    ...details,
  ].join("\n\n");
}
