import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

export type AppDownload = "gerador" | "consumidor";

const downloads = {
  gerador: {
    nome: "andrade-energy-gerador.apk",
    url: "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-gerador.apk",
  },
  consumidor: {
    nome: "andrade-energy-consumidor.apk",
    url: "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-consumidor.apk",
  },
} as const;

export async function baixarAplicativo(tipo: AppDownload) {
  const app = downloads[tipo];
  const destino = new File(Paths.cache, app.nome);
  const arquivo = await File.downloadFileAsync(app.url, destino, {
    idempotent: true,
  });
  if (!arquivo.exists || arquivo.size <= 0) {
    throw new Error("O arquivo baixado está vazio.");
  }
  if (Platform.OS === "android") {
    const contentUri = await FileSystemLegacy.getContentUriAsync(arquivo.uri);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      flags: 1,
      type: "application/vnd.android.package-archive",
    });
    return arquivo;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("O instalador não está disponível neste aparelho.");
  await Sharing.shareAsync(arquivo.uri, {
    dialogTitle: "Instalar Andrade Energy",
    mimeType: "application/vnd.android.package-archive",
    UTI: "public.apk",
  });
  return arquivo;
}
