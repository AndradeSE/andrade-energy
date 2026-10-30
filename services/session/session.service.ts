import * as SecureStore from "expo-secure-store";

export async function salvarSessao(usuario: any) {
  await SecureStore.setItemAsync(
    "usuario",
    JSON.stringify(usuario)
  );
}

export async function obterSessao() {
  const dados =
    await SecureStore.getItemAsync("usuario");

  if (!dados) return null;

  return JSON.parse(dados);
}

export async function removerSessao() {
  await SecureStore.deleteItemAsync("usuario");
}