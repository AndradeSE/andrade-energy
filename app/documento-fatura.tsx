import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, Text, UIManager, View } from "react-native";
import { Screen } from "../components/ui";
import { Colors } from "../theme";

export default function DocumentoFatura() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const [erro, setErro] = useState(false);
  const endereco = typeof uri === "string" && /^(https:\/\/|file:\/\/)/i.test(uri) ? uri : undefined;
  const Pdf = Platform.OS !== "web" && UIManager.getViewManagerConfig("RNPDFPdfView") && endereco ? require("react-native-pdf").default : null;
  return <Screen>
    <Pressable accessibilityRole="button" accessibilityLabel="Fechar fatura" onPress={() => router.back()} style={{ padding: 16 }}><Text style={{ color: Colors.primary }}>‹ Voltar · Fatura</Text></Pressable>
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {!endereco || erro ? <Text>Não foi possível abrir a fatura. Volte e tente novamente.</Text>
        : Platform.OS === "web" ? <iframe title="Fatura" src={endereco} style={{ width: "100%", height: "100%", border: 0 }} />
        : Pdf ? <Pdf source={{ uri: endereco }} trustAllCerts={false} onError={() => setErro(true)} style={{ flex: 1, width: "100%" }} /> : <Text style={{ padding: 16 }}>Atualize o aplicativo pelo link em Sobre o app para usar o leitor integrado de faturas.</Text>}
    </View>
  </Screen>;
}
