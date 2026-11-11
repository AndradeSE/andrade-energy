import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Screen } from "../components/ui";
import api from "../config/api";
import { Colors } from "../theme";

type Pagina = { pagina: number; total: number; largura: number; altura: number; imagem: string };
export default function DocumentoFatura() {
  const { uri, faturaId, tipo } = useLocalSearchParams<{ uri: string; faturaId: string; tipo: string }>();
  const [pagina, setPagina] = useState(0);
  const [dados, setDados] = useState<Pagina>();
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [zoom, setZoom] = useState(false);
  const { width } = useWindowDimensions();
  useEffect(() => {
    if (Platform.OS === "web") return;
    const abort = new AbortController();
    setDados(undefined);
    setErro("");
    api.get(`/faturas/${encodeURIComponent(faturaId)}/visualizacao`, {
      params: { pagina, tipo }, signal: abort.signal, timeout: 60_000,
    }).then(response => { if (!abort.signal.aborted) setDados(response.data); })
      .catch(error => { if (!abort.signal.aborted) setErro(error?.response?.data?.message ?? "Não foi possível abrir a fatura. Tente novamente."); });
    return () => abort.abort();
  }, [faturaId, tipo, pagina, tentativa]);
  const largura = Math.max(280, width - 16) * (zoom ? 2 : 1);
  return <Screen>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
      <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={{ color: Colors.primary }}>‹ Voltar · Fatura</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setZoom(!zoom)}><Text style={{ color: Colors.primary }}>{zoom ? "Reduzir" : "Ampliar"}</Text></Pressable>
    </View>
    {Platform.OS === "web" && /^https:\/\//.test(uri ?? "")
      ? <iframe title="Fatura" src={uri} style={{ width: "100%", height: "100%", border: 0 }} />
      : erro ? <View style={{ padding: 20, gap: 16 }}><Text>{erro}</Text><Pressable onPress={() => setTentativa(tentativa + 1)}><Text style={{ color: Colors.primary }}>Tentar novamente</Text></Pressable></View>
      : !dados ? <ActivityIndicator color={Colors.primary} style={{ margin: 32 }} />
      : <>
        <ScrollView horizontal contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
          <ScrollView style={{ width: largura }}><Image source={{ uri: dados.imagem }} style={{ width: largura, height: largura * dados.altura / dados.largura }} resizeMode="contain" /></ScrollView>
        </ScrollView>
        <View style={{ flexDirection: "row", justifyContent: "space-around", padding: 16 }}>
          <Pressable disabled={pagina === 0} onPress={() => setPagina(pagina - 1)}><Text style={{ color: pagina ? Colors.primary : Colors.subtitle }}>Anterior</Text></Pressable>
          <Text>{pagina + 1} de {dados.total}</Text>
          <Pressable disabled={pagina + 1 >= dados.total} onPress={() => setPagina(pagina + 1)}><Text style={{ color: pagina + 1 < dados.total ? Colors.primary : Colors.subtitle }}>Próxima</Text></Pressable>
        </View>
      </>}
  </Screen>;
}

