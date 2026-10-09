import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { environmentKeySuffix } from "../config/environment";

const CHAVE = `@andrade_energy_usuario${environmentKeySuffix}`;
const CHAVE_SEGURA = `andrade_energy_sessao${environmentKeySuffix}`;
let fila: Promise<unknown> = Promise.resolve();

function serializar<T>(operacao: () => Promise<T>): Promise<T> {
  const resultado = fila.then(operacao);
  fila = resultado.catch(() => undefined);
  return resultado;
}

export async function salvarSessao(usuario: any) {
  return serializar(async () => {
    const dados = JSON.stringify(usuario);
    if (Platform.OS === "web") return AsyncStorage.setItem(CHAVE, dados);
    await SecureStore.setItemAsync(CHAVE_SEGURA, dados);
    await AsyncStorage.removeItem(CHAVE);
  });
}

export async function obterSessao() {
  return serializar(async () => {
    const segura = Platform.OS === "web" ? null : await SecureStore.getItemAsync(CHAVE_SEGURA);
    const dados = segura ?? await AsyncStorage.getItem(CHAVE);
    if (!dados) return null;
    let sessao;
    try { sessao = JSON.parse(dados); }
    catch {
      await AsyncStorage.removeItem(CHAVE);
      if (Platform.OS !== "web") await SecureStore.deleteItemAsync(CHAVE_SEGURA);
      return null;
    }
    if (Platform.OS !== "web") {
      // Só apague a sessão antiga depois de confirmar a gravação protegida.
      // Falhas do cofre não permitem rebaixar a sessão para texto simples.
      if (!segura) await SecureStore.setItemAsync(CHAVE_SEGURA, dados);
      await AsyncStorage.removeItem(CHAVE);
    }
    return sessao;
  });
}

export async function removerSessao() {
  return serializar(async () => {
    await AsyncStorage.removeItem(CHAVE);
    if (Platform.OS !== "web") await SecureStore.deleteItemAsync(CHAVE_SEGURA);
  });
}

export async function usuarioLogado() {
  const usuario = await obterSessao();

  return !!usuario;
}
