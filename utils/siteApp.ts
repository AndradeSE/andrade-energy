import { Alert, Linking } from "react-native";

export const SITE_APP = "https://www.andradeenergy.com.br";
export async function abrirSiteApp() {
  try { await Linking.openURL(SITE_APP); }
  catch { Alert.alert("Não foi possível abrir o site", "Tente novamente ou acesse www.andradeenergy.com.br no navegador."); }
}
