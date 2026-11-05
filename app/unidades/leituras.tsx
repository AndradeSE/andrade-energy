import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";
import { AppHeader, Button, Card, Screen } from "../../components/ui";
import { buscarUnidade, listarAutoleituras } from "../../services/clientes.service";
import api from "../../config/api";
import { isPreviewEnvironment } from "../../config/environment";
import { obterSessao } from "../../storage/session";
import { Colors, Spacing } from "../../theme";

type Leitura = Awaited<ReturnType<typeof listarAutoleituras>>[number];
const estados: Record<string, string> = { RECEBIDA: "Aguardando envio", EM_ENVIO: "Envio em andamento", ENVIADA: "Protocolada na Cemig", RECUSADA: "Recusada pela Cemig", EM_REVISAO: "Aguardando conferência" };
export default function LeiturasDaUc() {
  const { id, numero } = useLocalSearchParams<{ id: string; numero: string }>();
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(false);
  async function carregar() {
    setCarregando(true); setErro(false);
    try { setLeituras(await listarAutoleituras(id)); }
    catch { setErro(true); }
    finally { setCarregando(false); }
  }
  useEffect(() => { void carregar(); }, [id]);
  const pendente = leituras.find(item => item.estado === "RECEBIDA");
  async function enviarAutomaticamente() {
    if (!pendente || enviando) return;
    setEnviando(true);
    try {
      const sessao = await obterSessao();
      const unidade = await buscarUnidade(id);
      if (!sessao?.token || !unidade?.usina_id) throw new Error("Confirme a sessão e a usina desta UC.");
      const fila = await api.get<{ itens: { id: string; unidade_id: string; leitura_kwh: number; data_programada: string; unidades_consumidoras: { numero: string } }[] }>(`/clientes/autoleitura/fila/${encodeURIComponent(unidade.usina_id)}`);
      const tarefa = fila.data.itens.find(item => item.id === pendente.id && item.unidade_id === id);
      if (!tarefa) throw new Error("Esta leitura não está mais disponível para envio. Atualize o histórico.");
      const data = new Date(`${tarefa.data_programada}T12:00:00Z`);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        packageName: isPreviewEnvironment ? "com.andradese.energy.gerador.preview" : "com.andradese.energy.gerador",
        className: "br.com.andradeenergy.cemig.CemigBrowserActivity",
        extra: {
          autoleituraPreview: JSON.stringify({ unidadeId: id, leituraId: tarefa.id, uc: tarefa.unidades_consumidoras.numero.replace(/\D/g, ""), leitura: String(tarefa.leitura_kwh), dataLocal: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }), referencia: `${data.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" })}/${data.getUTCFullYear()}` }),
          rateioApi: String(fila.config.baseURL ?? "").replace(/\/$/, ""), rateioToken: sessao.token, rateioUsina: unidade.usina_id,
        },
      });
      await carregar();
    } catch (e: any) { Alert.alert("Envio não iniciado", e?.response?.data?.message ?? e.message); }
    finally { setEnviando(false); }
  }
  return <Screen>
    <AppHeader variant="subpage" title="Leitura do medidor" subtitle={`UC ${numero ?? ""}`} contextTitle="Unidade consumidora" contextSubtitle="Envio e histórico" />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Informar leitura</Text>
      <Text>O cliente informa a leitura no aplicativo. Quando ela for recebida, escolha como enviar à Cemig.</Text>
      {pendente ? <Card><Text style={styles.title}>{pendente.leitura_kwh} kWh</Text><Text>Leitura recebida · prazo {pendente.data_programada.split("-").reverse().join("/")}</Text></Card> : null}
      <View style={styles.actions}>
        <Button title="Envio manual" onPress={() => Alert.alert("Envio manual", "O portal da Cemig será aberto. Selecione esta UC, informe a leitura e guarde o protocolo. O app não marcará um envio manual como protocolado sem confirmação.", [{ text: "Cancelar", style: "cancel" }, { text: "Abrir Cemig", onPress: () => { void Linking.openURL("https://atende.cemig.com.br/Login").catch(() => Alert.alert("Não foi possível abrir a Cemig")); } }])} />
        <Button title={enviando ? "Preparando..." : "Envio automático"} disabled={!pendente || enviando || Constants.expoConfig?.extra?.nativeCemigAutoleitura !== true} onPress={() => Alert.alert("Envio automático", isPreviewEnvironment ? "O navegador integrado usará o acesso salvo e preencherá a leitura para conferência. No Preview, o envio definitivo permanece bloqueado." : "O navegador integrado usará o acesso salvo para enviar esta leitura e registrar o protocolo. Se a Cemig exigir verificação, a sessão aguardará sua ação.", [{ text: "Cancelar", style: "cancel" }, { text: "Continuar", onPress: () => { void enviarAutomaticamente(); } }])} />
      </View>
      <Text style={styles.title}>Histórico de envio</Text>
      {carregando ? <Text>Consultando leituras...</Text> : erro ? <><Text>Não foi possível consultar o histórico.</Text><Button title="Tentar novamente" onPress={carregar} /></> : !leituras.length ? <Text>Nenhuma leitura recebida para esta UC.</Text> : leituras.map(item => <Card key={item.id}>
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
