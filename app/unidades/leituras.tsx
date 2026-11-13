import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";
import { AppHeader, Button, Card, Screen } from "../../components/ui";
import { buscarUnidade, listarAutoleituras } from "../../services/clientes.service";
import api from "../../config/api";
import { isPreviewEnvironment } from "../../config/environment";
import { CHAVE_ESTADO_AUTOLEITURA, obterSessao } from "../../storage/session";
import { Colors, Spacing } from "../../theme";

type Leitura = Awaited<ReturnType<typeof listarAutoleituras>>[number];
const estados: Record<string, string> = { RECEBIDA: "Aguardando envio", EM_ENVIO: "Envio em andamento", ENVIADA: "Protocolada na Cemig", RECUSADA: "Recusada pela Cemig", EM_REVISAO: "Aguardando conferência" };
export default function LeiturasDaUc() {
  const { id, numero } = useLocalSearchParams<{ id: string; numero: string }>();
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [configurando, setConfigurando] = useState(false);
  const [estadoEnvio, setEstadoEnvio] = useState<{ id: string; ativo: boolean }>();
  const [erro, setErro] = useState(false);
  async function carregar() {
    setCarregando(true); setErro(false);
    try { setLeituras(await listarAutoleituras(id)); }
    catch { setErro(true); }
    finally { setCarregando(false); }
  }
  useEffect(() => { void carregar(); }, [id]);
  useEffect(() => {
    if (Constants.expoConfig?.extra?.nativeCemigAutoleitura !== true || !id) return;
    let ativa = true;
    void Promise.all([buscarUnidade(id), obterSessao(), AsyncStorage.getItem(CHAVE_ESTADO_AUTOLEITURA)])
      .then(([unidade, sessao, salvo]) => {
        if (!ativa || !unidade?.usina_id || !sessao?.id || !salvo) return;
        const estados = JSON.parse(salvo) as Record<string, boolean>;
        const valor = estados[JSON.stringify([sessao.id, unidade.usina_id])];
        if (typeof valor === "boolean") setEstadoEnvio(atual => atual?.id === id ? atual : { id, ativo: valor });
      })
      .catch(() => undefined);
    return () => { ativa = false; };
  }, [id]);

  const envioAtivo = estadoEnvio?.id === id ? estadoEnvio?.ativo : undefined;
  const pendente = leituras.find(item => item.estado === "RECEBIDA");
  async function configurarEnvioAutomatico(ativar: boolean) {
    if (configurando) return;
    setConfigurando(true);
    try {
      const sessao = await obterSessao();
      const unidade = await buscarUnidade(id);
      if (!sessao?.token || !unidade?.usina_id) throw new Error("Confirme a sessão e a usina desta UC.");
      const fila = ativar ? await api.get(`/clientes/autoleitura/fila/${encodeURIComponent(unidade.usina_id)}`) : null;
      const result = await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        packageName: isPreviewEnvironment ? "com.andradese.energy.gerador.preview" : "com.andradese.energy.gerador",
        className: "br.com.andradeenergy.cemig.CemigBrowserActivity",
        extra: {
          autoleituraAutomationEnabled: ativar,
          rateioApi: String(fila?.config.baseURL ?? "").replace(/\/$/, ""),
          rateioToken: sessao.token,
          rateioUsina: unidade.usina_id,
        },
      });
      if (result.resultCode !== IntentLauncher.ResultCode.Success) throw new Error("O Android não aceitou a configuração.");
      setEstadoEnvio({ id, ativo: ativar });
      if (sessao.id) {
        const chave = JSON.stringify([sessao.id, unidade.usina_id]);
        try {
          const salvo = await AsyncStorage.getItem(CHAVE_ESTADO_AUTOLEITURA);
          const estados = salvo ? JSON.parse(salvo) : {};
          await AsyncStorage.setItem(CHAVE_ESTADO_AUTOLEITURA, JSON.stringify({ ...estados, [chave]: ativar }));
        } catch {
          await AsyncStorage.removeItem(CHAVE_ESTADO_AUTOLEITURA).catch(() => undefined);
        }
      }
      if (ativar) {
        Alert.alert(
          "Envio automático ativado nesta usina!",
          isPreviewEnvironment
            ? "Assim que o consumidor informar a leitura atual do medidor, o app verificará a fila em segundo plano e preparará a leitura para conferência."
            : "Assim que o consumidor informar a leitura atual do medidor, ela entra na fila da usina. Na próxima verificação em segundo plano, o app envia à Cemig as leituras elegíveis e registra o protocolo quando o envio for confirmado.",
        );
      } else {
        Alert.alert("Envio automático desativado nesta usina");
      }
    } catch (e: any) {
      Alert.alert("Configuração indisponível", e?.response?.data?.message ?? e.message);
    } finally {
      setConfigurando(false);
    }
  }
  return <Screen>
    <AppHeader variant="subpage" title="Leitura do medidor" subtitle={`UC ${numero ?? ""}`} contextTitle="Unidade consumidora" contextSubtitle="Envio e histórico" />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Informar leitura</Text>
      <Text>O cliente informa a leitura no aplicativo. Você pode enviá-la manualmente ou ativar o envio automático para a usina.</Text>
      {pendente ? <Card><Text style={styles.title}>{pendente.leitura_kwh} kWh</Text><Text>Leitura recebida · prazo {pendente.data_programada.split("-").reverse().join("/")}</Text></Card> : null}
      <View style={styles.actions}>
        <Button title="Envio manual" onPress={() => Alert.alert("Envio manual", "O portal da Cemig será aberto. Selecione esta UC, informe a leitura e guarde o protocolo. O app não marcará um envio manual como protocolado sem confirmação.", [{ text: "Cancelar", style: "cancel" }, { text: "Abrir Cemig", onPress: () => { void Linking.openURL("https://atende.cemig.com.br/Login").catch(() => Alert.alert("Não foi possível abrir a Cemig")); } }])} />
        {Constants.expoConfig?.extra?.nativeCemigAutoleitura === true ? <>
          <Text accessibilityLiveRegion="polite">Envio automático nesta usina · {envioAtivo === true ? "Ativado neste aparelho" : envioAtivo === false ? "Desativado neste aparelho" : "Status ainda não confirmado neste aparelho"}</Text>
          <Button title={configurando ? "Salvando…" : "Envio automático"} disabled={configurando} onPress={() => Alert.alert("Envio automático da usina", isPreviewEnvironment ? "O app verifica a fila em segundo plano e prepara leituras para conferência no Preview." : "O app verifica a fila desta usina em segundo plano e envia as leituras elegíveis à Cemig. Se o portal pedir verificação, o envio poderá precisar de revisão.", [
          { text: "Cancelar", style: "cancel" },
          { text: "Desativar", onPress: () => { void configurarEnvioAutomatico(false); } },
          { text: "Ativar", onPress: () => { void configurarEnvioAutomatico(true); } },
        ])} />
        </> : null}
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
