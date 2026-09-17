import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAVE = "preferencia:avisos-passo-a-passo";

export async function avisosPassoAPassoAtivos() {
  return (await AsyncStorage.getItem(CHAVE)) !== "0";
}

export async function definirAvisosPassoAPasso(ativos: boolean) {
  await AsyncStorage.setItem(CHAVE, ativos ? "1" : "0");
}
