import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "../../components/assistant/AssistantNativeControls";
import { AppHeader, Button, Card, Loading, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarUsina } from "../../services/usinas.service";
import api from "../../config/api";
import { isPreviewEnvironment } from "../../config/environment";
import { CHAVE_ESTADO_AUTOLEITURA, obterSessao } from "../../storage/session";
import { Colors, Spacing } from "../../theme";

export default function LeiturasAutomaticas() {
  const { user, usinaSelecionada } = useAuth();
  const params = useLocalSearchParams<{ usinaId?: string }>();
  const usinaId = typeof params.usinaId === "string" ? params.usinaId : usinaSelecionada?.id;
  const papel = String(user?.papel_empresa ?? "");
  const permitido = IS_GERADOR_APP && Boolean(user?.id) && (papel === "COLABORADOR_COMERCIAL" ? user?.permissoes?.gerador_operacao === true : papel === "COLABORADOR_GERADOR" ? user?.permissoes?.operacao === true : true);
  const consulta = useQuery({ queryKey: ["leituras-automaticas-usina", user?.id, user?.empresa_id, usinaId], enabled: permitido && Boolean(usinaId), queryFn: () => buscarUsina(usinaId!) });
  if (permitido && usinaId && consulta.isPending) return <Screen><Loading /></Screen>;
  return <Screen>
    <AppHeader variant="subpage" title="Leituras automáticas" subtitle={consulta.data?.nome ? `Usina ${consulta.data.nome}` : "Operação da usina"} contextTitle="Envio de leituras rurais" contextSubtitle="Controle geral da usina" />
    <ScrollView contentContainerStyle={styles.content}>
      {!permitido ? <Text>Seu acesso à operação não foi liberado.</Text> : !usinaId ? <Text>Selecione uma usina para configurar o envio de leituras.</Text> : consulta.isError || consulta.data?.id !== usinaId ? <Card><Text>Não foi possível confirmar o acesso à usina.</Text><Button title="Tentar novamente" onPress={() => void consulta.refetch()} /></Card> : <>
        <Text style={styles.explanation}>Ative de uma vez o envio automático para as UCs rurais habilitadas desta usina. As unidades urbanas e as UCs desativadas individualmente ficam de fora. Novas UCs rurais habilitadas entram nas próximas verificações.</Text>
        {Constants.expoConfig?.extra?.nativeCemigAutoleitura === true ? <ControleEnvio key={usinaId} usinaId={usinaId} /> : <Text>O envio automático está disponível no Gerador Android atualizado.</Text>}
        <Card><Text style={styles.title}>Desativar apenas uma UC</Text><Text style={styles.explanation}>Abra a unidade em Unidades consumidoras → Configurar autoleitura e desative a autoleitura dessa UC. O controle geral continua ativo para as demais unidades rurais habilitadas.</Text></Card>
      </>}
    </ScrollView>
  </Screen>;
}

function ControleEnvio({ usinaId }: { usinaId: string }) {
  const [configurando, setConfigurando] = useState(false);
  const [estadoEnvio, setEstadoEnvio] = useState<{ id: string; ativo: boolean }>();
  const estadoRevision = useRef(0);
  useFocusEffect(useCallback(() => {
    let ativa = true;
    const revision = estadoRevision.current;
    void Promise.all([obterSessao(), AsyncStorage.getItem(CHAVE_ESTADO_AUTOLEITURA)]).then(([sessao, salvo]) => {
      if (!ativa || !sessao?.id || !salvo) return;
      const valor = JSON.parse(salvo)?.[JSON.stringify([sessao.id, usinaId])];
      if (typeof valor === "boolean" && revision === estadoRevision.current) setEstadoEnvio({ id: usinaId, ativo: valor });
    }).catch(() => undefined);
    return () => { ativa = false; };
  }, [usinaId]));
  const envioAtivo = estadoEnvio?.id === usinaId ? estadoEnvio.ativo : undefined;
  async function configurarEnvioAutomatico(ativar: boolean) {
    if (configurando) return;
    setConfigurando(true);
    try {
      const sessao = await obterSessao();
      const unidade = { usina_id: usinaId };
      if (!sessao?.token || !unidade?.usina_id) throw new Error("Confirme a sessão e a usina selecionada.");
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
      estadoRevision.current += 1;
      setEstadoEnvio({ id: usinaId, ativo: ativar });
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

  return <Card>
          <View style={styles.automationHeader}>
            <Ionicons name="sync-outline" size={24} color={Colors.primary} />
            <Text style={styles.title}>Envio automático de leituras</Text>
          </View>
          <Text style={styles.scope}>Todas as UCs rurais habilitadas desta usina · neste aparelho</Text>
          <View accessibilityRole="radiogroup" style={styles.toggle}>
            {([false, true] as const).map(ativar => {
              const selecionado = envioAtivo === ativar;
              return <TouchableOpacity key={String(ativar)} accessibilityRole="radio" accessibilityLabel={ativar ? "Ativar envio automático de leituras" : "Desativar envio automático de leituras"} accessibilityState={{ checked: selecionado, disabled: configurando, busy: configurando }} disabled={configurando || selecionado} onPress={() => { void configurarEnvioAutomatico(ativar); }} style={[styles.toggleOption, selecionado && (ativar ? styles.toggleOn : styles.toggleOff), configurando && styles.busy]}>
                <Ionicons name={ativar ? "checkmark-circle-outline" : "pause-circle-outline"} size={21} color={selecionado ? "#FFFFFF" : Colors.primaryDark} />
                <Text style={[styles.toggleText, selecionado && styles.toggleSelectedText]}>{ativar ? "Ativado" : "Desativado"}</Text>
              </TouchableOpacity>;
            })}
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.status}>{configurando ? "Salvando configuração…" : envioAtivo === undefined ? "Estado ainda não confirmado. Escolha uma opção para configurar neste aparelho." : envioAtivo ? "Ativado neste aparelho" : "Desativado neste aparelho"}</Text>
          <Text style={styles.explanation}>{envioAtivo === false ? "As leituras recebidas continuam no histórico, mas este aparelho não fará novos envios automáticos. Você pode usar o envio manual." : isPreviewEnvironment ? "Quando ativado, o Preview verifica a fila desta usina em segundo plano e prepara as leituras elegíveis para conferência." : "Quando ativado, o app verifica a fila desta usina em segundo plano e envia as leituras elegíveis à Cemig. A configuração vale para as UCs desta usina, não apenas para esta unidade."}</Text>
          <Text style={styles.explanation}>O Android define o momento da verificação. É necessário ter internet e acesso válido à Cemig. O protocolo só aparece após a confirmação do envio.</Text>
        </Card>;
}
const styles = StyleSheet.create({ content: { padding: Spacing.lg, gap: Spacing.lg }, title: { fontSize: 18, fontWeight: "700", color: Colors.primary }, actions: { gap: Spacing.md }, automationHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm }, scope: { color: Colors.subtitle, fontSize: 13, marginTop: Spacing.sm }, toggle: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md }, toggleOption: { flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: Colors.primaryLight, backgroundColor: Colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, padding: Spacing.sm }, toggleOn: { backgroundColor: Colors.primary, borderColor: Colors.primary }, toggleOff: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark }, toggleText: { fontSize: 15, fontWeight: "700", color: Colors.primaryDark }, toggleSelectedText: { color: "#FFFFFF" }, busy: { opacity: 0.6 }, status: { color: Colors.primaryDark, fontWeight: "700", marginTop: Spacing.md }, explanation: { color: Colors.subtitle, fontSize: 13, lineHeight: 20, marginTop: Spacing.sm } });

