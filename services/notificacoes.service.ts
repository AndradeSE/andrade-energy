import api from "../config/api";
import Constants from "expo-constants";
import { Platform } from "react-native";

export async function listarNotificacoesApp() {
  const { data } = await api.get("/notificacoes");
  return data as { id: string; tipo: string; titulo: string; detalhe?: string; rota?: string; criado_em: string }[];
}

export async function registrarPushAndroid() {
  if (Platform.OS !== "android") return null;
  const Notifications = await import("expo-notifications");
  await Notifications.setNotificationChannelAsync("avisos-importantes", {
    name: "Avisos importantes",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 180, 250],
    sound: "default",
  });
  const atual = await Notifications.getPermissionsAsync();
  const permissao = atual.status === "granted" ? atual : await Notifications.requestPermissionsAsync();
  if (permissao.status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("EAS projectId não configurado.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api.post("/notificacoes/push-token", {
    token,
    plataforma: Platform.OS,
    appVariante: Constants.expoConfig?.extra?.appVariant,
  });
  return token;
}
