import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const chave = (usuarioId: string) => `carteira:recebido:${usuarioId}`;

export async function verificarNovoRecebimento(usuarioId: string, totalRecebido: number) {
  const anteriorTexto = await AsyncStorage.getItem(chave(usuarioId));
  await AsyncStorage.setItem(chave(usuarioId), String(totalRecebido));
  if (anteriorTexto === null) return false;
  const anterior = Number(anteriorTexto);
  if (!(totalRecebido > anterior)) return false;

  if (Platform.OS !== "web") {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("carteira", {
        name: "Recebimentos da carteira",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const permissaoAtual = await Notifications.getPermissionsAsync();
    const permissao = permissaoAtual.status === "granted" ? permissaoAtual : await Notifications.requestPermissionsAsync();
    if (permissao.status === "granted") {
      const valor = totalRecebido - anterior;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Novo valor recebido",
          body: `${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} entrou na sua carteira Andrade Energy.`,
          data: { url: "/financeiro" },
        },
        trigger: null,
      });
      await Notifications.setBadgeCountAsync(1);
    }
  }
  return true;
}

export async function marcarCarteiraComoVista() {
  if (Platform.OS !== "web") await Notifications.setBadgeCountAsync(0);
}
