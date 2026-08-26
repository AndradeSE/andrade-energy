import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

async function carregarNotificacoes() {
  if (Platform.OS === "web" || Constants.appOwnership === "expo") return null;
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  return Notifications;
}

const chave = (usuarioId: string) => `carteira:recebido:${usuarioId}`;

export async function verificarNovoRecebimento(usuarioId: string, totalRecebido: number) {
  const anteriorTexto = await AsyncStorage.getItem(chave(usuarioId));
  await AsyncStorage.setItem(chave(usuarioId), String(totalRecebido));
  if (anteriorTexto === null) return false;
  const anterior = Number(anteriorTexto);
  if (!(totalRecebido > anterior)) return false;

  const Notifications = await carregarNotificacoes();
  if (Notifications) {
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
  const Notifications = await carregarNotificacoes();
  if (Notifications) await Notifications.setBadgeCountAsync(0);
}
