import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createSecureSession } from "./secure-session";
import { environmentKeySuffix } from "../config/environment";
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as IntentLauncher from 'expo-intent-launcher';

const CHAVE = `@andrade_energy_usuario${environmentKeySuffix}`;
const secureSession = createSecureSession({
  getItem: SecureStore.getItemAsync,
  setItem: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }),
  removeItem: SecureStore.deleteItemAsync,
}, AsyncStorage, CHAVE, `andrade.session${environmentKeySuffix}`);

async function encerrarAutomacaoNativa(){
  if(Platform.OS!=='android'||Constants.expoConfig?.extra?.nativeCemigAutomation!==true)return;
  const result=await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{
    packageName:Application.applicationId ?? undefined,className:'br.com.andradeenergy.cemig.CemigBrowserActivity',extra:{rateioAutomationClearAll:true},
  });
  if(result.resultCode!==-1)throw new Error('Não foi possível encerrar as tarefas de rateio. Tente sair novamente.');
}

export async function salvarSessao(usuario: any) {
  if (Platform.OS !== "web") {
    const anterior=await secureSession.get();
    if(anterior?.id&&anterior.id!==usuario?.id)await encerrarAutomacaoNativa();
    else if(anterior?.id===usuario?.id&&anterior?.token!==usuario?.token&&Platform.OS==='android'&&Constants.expoConfig?.extra?.nativeCemigAutomation===true){
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW',{packageName:Application.applicationId ?? undefined,className:'br.com.andradeenergy.cemig.CemigBrowserActivity',extra:{rateioAutomationRefreshToken:usuario.token}});
    }
    return secureSession.save(usuario);
  }
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
  await encerrarAutomacaoNativa();
  if (Platform.OS !== "web") return secureSession.remove();
  await AsyncStorage.removeItem(CHAVE);
}

export async function usuarioLogado() {
  const usuario = await obterSessao();

  return !!usuario;
}
