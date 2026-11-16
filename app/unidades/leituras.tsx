import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader, Button, Card, Loading, Screen } from "../../components/ui";
import { listarAutoleituras } from "../../services/clientes.service";
import { Colors, Spacing } from "../../theme";

type Leitura = Awaited<ReturnType<typeof listarAutoleituras>>[number];
const estados: Record<string, string> = { RECEBIDA: "Aguardando envio", EM_ENVIO: "Envio em andamento", ENVIADA: "Protocolada na Cemig", RECUSADA: "Recusada pela Cemig", EM_REVISAO: "Aguardando conferência" };
export default function LeiturasDaUc() {
  const { id, numero } = useLocalSearchParams<{ id: string; numero: string }>();
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  async function carregar() {
    setCarregando(true); setErro(false);
    try { setLeituras(await listarAutoleituras(id)); }
    catch { setErro(true); }
    finally { setCarregando(false); }
  }
  useEffect(() => { void carregar(); }, [id]);
  const pendente = leituras.find(item => item.estado === "RECEBIDA");
  if (carregando) return <Screen><Loading /></Screen>;

  return <Screen>
    <AppHeader variant="subpage" title="Leitura do medidor" subtitle={`UC ${numero ?? ""}`} contextTitle="Unidade consumidora" contextSubtitle="Envio e histórico" />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Informar leitura</Text>
      <Text>O cliente informa a leitura no aplicativo. Você pode enviá-la manualmente. O envio automático da usina fica em Operação → Leituras automáticas.</Text>
      {pendente ? <Card><Text style={styles.title}>{pendente.leitura_kwh} kWh</Text><Text>Leitura recebida · prazo {pendente.data_programada.split("-").reverse().join("/")}</Text></Card> : null}
      <View style={styles.actions}>
        <Button title="Envio manual" onPress={() => Alert.alert("Envio manual", "O portal da Cemig será aberto. Selecione esta UC, informe a leitura e guarde o protocolo. O app não marcará um envio manual como protocolado sem confirmação.", [{ text: "Cancelar", style: "cancel" }, { text: "Abrir Cemig", onPress: () => { void Linking.openURL("https://atende.cemig.com.br/Login").catch(() => Alert.alert("Não foi possível abrir a Cemig")); } }])} />

      </View>
      <Text style={styles.title}>Histórico de envio</Text>
      {erro ? <><Text>Não foi possível consultar o histórico.</Text><Button title="Tentar novamente" onPress={carregar} /></> : !leituras.length ? <Text>Nenhuma leitura recebida para esta UC.</Text> : leituras.map(item => <Card key={item.id}>
        <Text style={styles.title}>{item.leitura_kwh} kWh</Text>
        <Text>{item.data_programada.split("-").reverse().join("/")} · {estados[item.estado] ?? item.estado}</Text>
        {item.protocolo_cemig ? <Text>Protocolo {item.protocolo_cemig}</Text> : null}
        {item.estimativa_cemig != null ? <Text>Estimativa {Number(item.estimativa_cemig).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text> : null}
      </Card>)}
      <Button title="Atualizar histórico" disabled={carregando} onPress={carregar} />
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({ content: { padding: Spacing.lg, gap: Spacing.lg }, title: { fontSize: 18, fontWeight: "700", color: Colors.primary }, actions: { gap: Spacing.md } });
