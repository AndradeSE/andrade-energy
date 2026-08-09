import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAVE = "@andrade_energy_usuario";

export async function salvarSessao(usuario: any) {
  await AsyncStorage.setItem(
    CHAVE,
    JSON.stringify(usuario)
  );
}

export async function obterSessao() {
  const dados = await AsyncStorage.getItem(CHAVE);

  if (!dados) {
    return null;
  }

  return JSON.parse(dados);
}

export async function removerSessao() {
  await AsyncStorage.removeItem(CHAVE);
}

export async function usuarioLogado() {
  const usuario = await obterSessao();

  return !!usuario;
}