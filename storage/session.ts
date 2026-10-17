import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createSecureSession } from "./secure-session";
import { environmentKeySuffix } from "../config/environment";

const CHAVE = `@andrade_energy_usuario${environmentKeySuffix}`;
const secureSession = createSecureSession({
  getItem: SecureStore.getItemAsync,
  setItem: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
  removeItem: SecureStore.deleteItemAsync,
}, AsyncStorage, CHAVE, `andrade.session${environmentKeySuffix}`);

export async function salvarSessao(usuario: any) {
  if (Platform.OS !== "web") return secureSession.save(usuario);
  await AsyncStorage.setItem(
    CHAVE,
    JSON.stringify(usuario)
  );
}

export async function obterSessao() {
  if (Platform.OS !== "web") return secureSession.get();
  const dados = await AsyncStorage.getItem(CHAVE);

  if (!dados) {
    return null;
  }

  return JSON.parse(dados);
}

export async function removerSessao() {
  if (Platform.OS !== "web") return secureSession.remove();
  await AsyncStorage.removeItem(CHAVE);
}

export async function usuarioLogado() {
  const usuario = await obterSessao();

  return !!usuario;
}
