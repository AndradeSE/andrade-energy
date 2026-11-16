import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "../../components/assistant/AssistantNativeControls";
import { Button, Card } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { listarUnidadesGestor } from "../../services/clientes.service";
import { summarizeReadingAutomation } from "../../services/reading-automation-summary";
import api from "../../config/api";
import { isPreviewEnvironment } from "../../config/environment";
import { CHAVE_ESTADO_AUTOLEITURA, obterSessao } from "../../storage/session";
import { Colors, Spacing } from "../../theme";

export default function AutomaticReadingControl({ usinaId }: { usinaId: string }) {
  const { user } = useAuth();
  const nativeAvailable = Platform.OS === "android" && Constants.expoConfig?.extra?.nativeCemigAutoleitura === true;
  const unidades = useQuery({ queryKey: ["reading-automation-units", user?.id, user?.empresa_id, usinaId], enabled: nativeAvailable && Boolean(user?.id && usinaId), queryFn: async () => { const data = await listarUnidadesGestor(usinaId); if (!Array.isArray(data)) throw new Error("Lista de UCs indisponível."); return data; } });
  useFocusEffect(useCallback(() => { if (nativeAvailable) void unidades.refetch(); }, [usinaId, nativeAvailable]));
  const [listaVisivel, setListaVisivel] = useState<"ativadas" | "desativadas" | null>(null);
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
  const resumo = summarizeReadingAutomation(unidades.data, usinaId, envioAtivo);
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

  if (!nativeAvailable) return <Card><Text style={styles.title}>Leituras automáticas</Text><Text style={styles.explanation}>O envio em segundo plano está disponível no Gerador Android atualizado.</Text></Card>;
  return <Card>
          <View style={styles.automationHeader}>
            <Ionicons name="sync-outline" size={24} color={Colors.primary} />
            <Text style={styles.title}>Envio automático de leituras</Text>
          </View>
          <Text style={styles.scope}>Todas as UCs rurais habilitadas desta usina · neste aparelho</Text>
          <Button title={configurando ? "Salvando…" : envioAtivo === true ? "Desativar envio automático" : "Ativar envio automático"} disabled={configurando} onPress={() => { void configurarEnvioAutomatico(envioAtivo !== true); }} />
          <Text accessibilityLiveRegion="polite" style={styles.status}>{configurando ? "Salvando configuração…" : envioAtivo === undefined ? "Estado geral ainda não confirmado neste aparelho." : envioAtivo ? "Ativado neste aparelho" : "Desativado neste aparelho"}</Text>
          <Text style={styles.explanation}>{envioAtivo === false ? "As leituras recebidas continuam no histórico, mas este aparelho não fará novos envios automáticos. Você pode usar o envio manual." : isPreviewEnvironment ? "Quando ativado, o Preview verifica a fila desta usina em segundo plano e prepara as leituras elegíveis para conferência." : "Quando ativado, o app verifica a fila desta usina em segundo plano e envia as leituras elegíveis à Cemig. A configuração vale para as UCs desta usina, não apenas para esta unidade."}</Text>
          {unidades.isPending ? <Text style={styles.explanation}>Consultando UCs rurais…</Text> : unidades.isError ? <><Text style={styles.explanation}>Não foi possível consultar as UCs. As quantidades não estão disponíveis.</Text><Button title="Atualizar UCs" onPress={() => void unidades.refetch()} /></> : <>
            <TouchableOpacity accessibilityRole="button" onPress={() => setListaVisivel(listaVisivel === "desativadas" ? null : "desativadas")} style={styles.notice}>
              <Ionicons name="alert-circle-outline" size={24} color={Colors.primaryDark} />
              <View style={styles.unitIdentity}><Text style={styles.status}>{envioAtivo === undefined ? `Você tem ${resumo.desativadas} ${resumo.desativadas === 1 ? "UC rural sem habilitação" : "UCs rurais sem habilitação"} para envio.` : `Você tem ${resumo.desativadas} ${resumo.desativadas === 1 ? "UC" : "UCs"} com envio automático desativado.`}</Text><Text style={styles.explanation}>Toque para ver quais.</Text></View>
              <Ionicons name={listaVisivel === "desativadas" ? "chevron-up" : "chevron-down"} size={20} color={Colors.primaryDark} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={() => setListaVisivel(listaVisivel === "ativadas" ? null : "ativadas")}><Text style={styles.status}>{envioAtivo === undefined ? "UCs habilitadas" : "UCs com envio ativado"}: {resumo.ativadas} · Toque para consultar</Text></TouchableOpacity>
            {listaVisivel ? <>
              <Text style={styles.status}>{listaVisivel === "ativadas" ? "UCs ativadas" : "UCs desativadas"}</Text>
              {resumo.itens.filter(item => item.ativa === (listaVisivel === "ativadas")).map(item => <View key={item.id} style={styles.unitRow}>
                <View style={styles.unitIdentity}><Text style={styles.unitName}>{item.apelido || "Unidade consumidora"}</Text><Text style={styles.explanation}>UC {item.numero}</Text></View>
                <View style={styles.unitState}><Text style={[styles.unitStatus, !item.ativa && styles.unitInactive]}>{item.ativa ? "Ativada" : "Desativada"}</Text><Text style={styles.reason}>{item.motivo}</Text></View>
              </View>)}
              {!resumo.itens.some(item => item.ativa === (listaVisivel === "ativadas")) ? <Text style={styles.explanation}>Nenhuma UC nesta situação.</Text> : null}
            </> : null}
            {envioAtivo === undefined ? <Text style={styles.explanation}>Os estados acima mostram a habilitação individual. O envio geral ainda precisa ser confirmado neste aparelho.</Text> : null}
          </>}
          <Text style={styles.explanation}>O Android define o momento da verificação. É necessário ter internet e acesso válido à Cemig. O protocolo só aparece após a confirmação do envio.</Text>
        </Card>;
}
const styles = StyleSheet.create({ notice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, marginTop: 14, borderRadius: 12, backgroundColor: "#FFF4D6" }, unitRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.primaryLight }, unitIdentity: { flex: 1 }, unitState: { flex: 1, alignItems: "flex-end" }, unitName: { color: Colors.primaryDark, fontWeight: "700" }, unitStatus: { color: Colors.primary, fontWeight: "800" }, unitInactive: { color: Colors.subtitle }, reason: { color: Colors.subtitle, fontSize: 12, textAlign: "right", marginTop: 4 }, content: { padding: Spacing.lg, gap: Spacing.lg }, title: { fontSize: 18, fontWeight: "700", color: Colors.primary }, actions: { gap: Spacing.md }, automationHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm }, scope: { color: Colors.subtitle, fontSize: 13, marginTop: Spacing.sm }, toggle: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md }, toggleOption: { flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: Colors.primaryLight, backgroundColor: Colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, padding: Spacing.sm }, toggleOn: { backgroundColor: Colors.primary, borderColor: Colors.primary }, toggleOff: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark }, toggleText: { fontSize: 15, fontWeight: "700", color: Colors.primaryDark }, toggleSelectedText: { color: "#FFFFFF" }, busy: { opacity: 0.6 }, status: { color: Colors.primaryDark, fontWeight: "700", marginTop: Spacing.md }, explanation: { color: Colors.subtitle, fontSize: 13, lineHeight: 20, marginTop: Spacing.sm } });

