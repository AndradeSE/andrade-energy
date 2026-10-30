import { Linking, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import api from "../config/api";

// Consulta a versão exata, inclusive no histórico, e renova o link privado.
export async function abrirDocumentoContrato(id: string) {
  const { data: contrato } = await api.get(`/contratos/${id}/documento`);
  const url = contrato?.contrato_assinado_url ?? contrato?.contrato_gerado_url;
  if (!url) throw new Error("Este contrato ainda não possui minuta gerada para leitura.");
  if (Platform.OS !== "android") { await Linking.openURL(url); return; }
  const arquivo = await FileSystem.downloadAsync(url, `${FileSystem.cacheDirectory}contrato-${id}-${Date.now()}.pdf`);
  if (arquivo.status !== 200) throw new Error("Não foi possível baixar o PDF. Tente novamente.");
  const contentUri = await FileSystem.getContentUriAsync(arquivo.uri);
  try {
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, flags: 1, type: "application/pdf" });
  } catch {
    if (!(await Sharing.isAvailableAsync())) throw new Error("Instale um leitor de PDF para abrir o contrato.");
    await Sharing.shareAsync(arquivo.uri, { mimeType: "application/pdf", dialogTitle: "Abrir contrato" });
  }
}
