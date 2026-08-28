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

export async function baixarAplicativo(
  tipo: AppDownload,
  onProgress?: (percentual: number) => void,
) {
  const app = downloads[tipo];
  const destino = `${FileSystemLegacy.cacheDirectory}${Date.now()}-${app.nome}`;
  onProgress?.(0);
  const download = FileSystemLegacy.createDownloadResumable(
    app.url,
    destino,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite <= 0) return;
      onProgress?.(
        Math.min(
          100,
          Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100),
        ),
      );
    },
  );
  const arquivo = await download.downloadAsync();
  if (!arquivo?.uri) {
    throw new Error("O download do instalador não foi concluído.");
  }
  const info = await FileSystemLegacy.getInfoAsync(arquivo.uri);
  if (!info.exists || !("size" in info) || !info.size || info.size <= 0) {
    throw new Error("O arquivo baixado está vazio.");
  }
  onProgress?.(100);
  if (Platform.OS === "android") {
    const contentUri = await FileSystemLegacy.getContentUriAsync(arquivo.uri);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      flags: 1,
      type: "application/vnd.android.package-archive",
    });
    return info;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("O instalador não está disponível neste aparelho.");
  await Sharing.shareAsync(arquivo.uri, {
    dialogTitle: "Instalar Andrade Energy",
    mimeType: "application/vnd.android.package-archive",
    UTI: "public.apk",
  });
  return info;
}
