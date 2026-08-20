import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Card, EmptyState, Loading, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import {
  ativarRecebimentoFaturas,
  desativarRecebimentoFaturas,
  obterRecebimentoFaturas,
  regenerarEnderecoRecebimento,
  StatusRecebimentoFaturas,
} from "../../services/recebimento-faturas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const titulosStatus: Record<string, string> = {
  NAO_CONFIGURADO: "Não configurado",
  AGUARDANDO_FATURA: "Aguardando a primeira conta",
  AGUARDANDO_CONFERENCIA: "Conta recebida para conferência",
  PROCESSADO: "Última conta processada",
  DESATIVADO: "Recebimento desativado",
  ERRO: "Atenção necessária",
};

function formatarData(valor?: string | null) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function RecebimentoEmail() {
  const { unidadeSelecionada } = useAuth();
  const [dados, setDados] = useState<StatusRecebimentoFaturas>();
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const unidadeId = unidadeSelecionada?.id;

  const carregar = useCallback(async () => {
    if (!unidadeId) {
      setCarregando(false);
      return;
    }
    try {
      setDados(await obterRecebimentoFaturas(unidadeId));
    } catch (erro: any) {
      Alert.alert("Não foi possível carregar", erro?.response?.data?.message ?? "Confira sua conexão e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [unidadeId]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  async function atualizarPagina() {
    setAtualizando(true);
    try { await carregar(); } finally { setAtualizando(false); }
  }

  async function ativar() {
    if (!unidadeId) return;
    try {
      setSalvando(true);
      setDados(await ativarRecebimentoFaturas(unidadeId));
    } catch (erro: any) {
      Alert.alert("Não foi possível ativar", erro?.response?.data?.message ?? "Tente novamente em alguns instantes.");
    } finally { setSalvando(false); }
  }

  async function copiarEndereco() {
    if (!dados?.endereco) return;
    await Clipboard.setStringAsync(dados.endereco);
    Alert.alert("Endereço copiado", "Cole este endereço na regra de encaminhamento do seu e-mail.");
  }

  function confirmarRegeneracao() {
    Alert.alert("Gerar novo endereço", "O endereço atual deixará de receber contas. Deseja continuar?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Gerar novo", style: "destructive", onPress: async () => {
        if (!unidadeId) return;
        try { setSalvando(true); setDados(await regenerarEnderecoRecebimento(unidadeId)); }
        catch (erro: any) { Alert.alert("Não foi possível gerar", erro?.response?.data?.message ?? "Tente novamente."); }
        finally { setSalvando(false); }
      } },
    ]);
  }

  function confirmarDesativacao() {
    Alert.alert("Desativar recebimento", "Novas contas encaminhadas deixarão de ser processadas automaticamente.", [
      { text: "Voltar", style: "cancel" },
      { text: "Desativar", style: "destructive", onPress: async () => {
        if (!unidadeId) return;
        try { setSalvando(true); setDados(await desativarRecebimentoFaturas(unidadeId)); }
        catch (erro: any) { Alert.alert("Não foi possível desativar", erro?.response?.data?.message ?? "Tente novamente."); }
        finally { setSalvando(false); }
      } },
    ]);
  }

  if (carregando) return <Loading />;
  if (!unidadeId) return <Screen><View style={styles.state}><EmptyState icon="flash-outline" title="Escolha uma unidade" subtitle="Selecione uma unidade consumidora antes de configurar o recebimento automático." /></View></Screen>;

  const status = dados?.status ?? "NAO_CONFIGURADO";
  const tituloStatus = titulosStatus[status] ?? "Em configuração";
  const temErro = status === "ERRO";

  return <Screen>
    <ScrollView bounces alwaysBounceVertical overScrollMode="always" refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heading}>
        <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color={Colors.text} /></TouchableOpacity>
        <View style={styles.headingText}><Text style={styles.eyebrow}>SUA CONTA DE LUZ</Text><Text style={styles.title}>Receber contas automaticamente</Text><Text style={styles.subtitle}>Encaminhe a fatura da concessionária para que ela seja lida e calculada com segurança.</Text></View>
      </View>

      <Card style={styles.unitCard}>
        <View style={styles.unitIcon}><Ionicons name="flash-outline" size={23} color={Colors.primary} /></View>
        <View style={styles.unitInfo}><Text style={styles.unitLabel}>UNIDADE CONSUMIDORA</Text><Text style={styles.unitNumber}>{unidadeSelecionada.numero}</Text></View>
      </Card>

      {!dados?.configurado ? <Card style={styles.pendingCard}><Ionicons name="time-outline" size={24} color={Colors.warning} /><View style={styles.pendingCopy}><Text style={styles.pendingTitle}>Configuração em preparação</Text><Text style={styles.pendingText}>O endereço de recebimento será liberado assim que a Andrade Energy concluir a configuração segura do domínio.</Text></View></Card> : <>
        <Card style={[styles.statusCard, temErro && styles.statusCardError]}>
          <View style={[styles.statusIcon, temErro && styles.statusIconError]}><Ionicons name={temErro ? "alert-circle-outline" : dados?.ativo ? "mail-unread-outline" : "mail-outline"} size={23} color={temErro ? Colors.danger : Colors.primary} /></View>
          <View style={styles.statusCopy}><Text style={styles.statusTitle}>{tituloStatus}</Text><Text style={styles.statusText}>{dados?.ativo ? "As contas enviadas a este endereço entram na fila de conferência." : "Ative para gerar o endereço exclusivo desta unidade."}</Text></View>
        </Card>

        {dados?.ativo && dados.endereco ? <>
          <Text style={styles.sectionTitle}>SEU ENDEREÇO EXCLUSIVO</Text>
          <TouchableOpacity activeOpacity={0.82} onPress={copiarEndereco} style={styles.addressCard}>
            <View style={styles.addressIcon}><Ionicons name="mail-outline" size={21} color={Colors.primary} /></View>
            <Text selectable style={styles.address}>{dados.endereco}</Text>
            <Ionicons name="copy-outline" size={21} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.addressHint}>Toque para copiar. Este endereço é exclusivo desta UC e pode ser alterado a qualquer momento.</Text>

          <Text style={styles.sectionTitle}>COMO CONFIGURAR</Text>
          <Card>
            <Instruction number="1" text="No Gmail ou Outlook, abra as regras de encaminhamento automático." />
            <Instruction number="2" text="Crie uma regra para contas enviadas pela sua concessionária." />
            <Instruction number="3" text="Encaminhe os e-mails com PDF para o endereço acima." />
            <Instruction number="4" text="Quando a conta chegar, ela será calculada e ficará em conferência antes da cobrança." last />
          </Card>

          {dados.ultimoRecebimentoEm ? <Text style={styles.lastReceipt}>Último recebimento: {formatarData(dados.ultimoRecebimentoEm)}</Text> : null}
          {dados.erro ? <Text style={styles.errorText}>{dados.erro}</Text> : null}

          <TouchableOpacity disabled={salvando} onPress={confirmarRegeneracao} style={styles.secondaryAction}><Ionicons name="refresh-outline" size={19} color={Colors.primary} /><Text style={styles.secondaryText}>Gerar novo endereço</Text></TouchableOpacity>
          <TouchableOpacity disabled={salvando} onPress={confirmarDesativacao} style={styles.dangerAction}><Ionicons name="close-circle-outline" size={19} color={Colors.danger} /><Text style={styles.dangerText}>Desativar recebimento</Text></TouchableOpacity>
        </> : <TouchableOpacity disabled={salvando} activeOpacity={0.84} onPress={ativar} style={[styles.primaryAction, salvando && styles.disabled]}><Ionicons name="mail-unread-outline" size={21} color={Colors.surface} /><Text style={styles.primaryText}>{salvando ? "Ativando..." : "Ativar recebimento automático"}</Text></TouchableOpacity>}
      </>}
    </ScrollView>
  </Screen>;
}

function Instruction({ number, text, last = false }: { number: string; text: string; last?: boolean }) {
  return <View style={[styles.instruction, !last && styles.instructionBorder]}><View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>{number}</Text></View><Text style={styles.instructionText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, state: { flex: 1, justifyContent: "center", padding: Spacing.lg }, heading: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.lg }, back: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs, borderRadius: Radius.round, backgroundColor: Colors.surface }, headingText: { flex: 1 }, eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 }, title: { marginTop: 4, color: Colors.text, fontSize: Typography.section, fontWeight: "900" }, subtitle: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 20 }, unitCard: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg, padding: Spacing.md }, unitIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, unitInfo: { marginLeft: Spacing.sm }, unitLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: .7 }, unitNumber: { marginTop: 3, color: Colors.text, fontSize: Typography.body, fontWeight: "900" }, pendingCard: { flexDirection: "row", alignItems: "flex-start", padding: Spacing.md }, pendingCopy: { flex: 1, marginLeft: Spacing.sm }, pendingTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, pendingText: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 }, statusCard: { flexDirection: "row", alignItems: "center", padding: Spacing.md }, statusCardError: { borderWidth: 1, borderColor: "#FECACA" }, statusIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, statusIconError: { backgroundColor: "#FEE2E2" }, statusCopy: { flex: 1, marginLeft: Spacing.sm }, statusTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "900" }, statusText: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 }, sectionTitle: { marginTop: Spacing.xl, marginBottom: Spacing.sm, color: Colors.subtitle, fontSize: 10, fontWeight: "900", letterSpacing: .9 }, addressCard: { minHeight: 68, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.lg, backgroundColor: Colors.surface }, addressIcon: { marginRight: Spacing.sm }, address: { flex: 1, color: Colors.text, fontSize: Typography.small, fontWeight: "800" }, addressHint: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 }, instruction: { minHeight: 58, flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm }, instructionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border }, instructionNumber: { width: 28, height: 28, alignItems: "center", justifyContent: "center", marginRight: Spacing.sm, borderRadius: Radius.round, backgroundColor: Colors.primaryLight }, instructionNumberText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "900" }, instructionText: { flex: 1, color: Colors.text, fontSize: Typography.small, lineHeight: 19 }, lastReceipt: { marginTop: Spacing.lg, color: Colors.subtitle, fontSize: Typography.small }, errorText: { marginTop: Spacing.xs, color: Colors.danger, fontSize: Typography.small, lineHeight: 18 }, primaryAction: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.xl, borderRadius: Radius.lg, backgroundColor: Colors.primary }, primaryText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" }, disabled: { opacity: .65 }, secondaryAction: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.xl, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md }, secondaryText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "900" }, dangerAction: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.sm, borderRadius: Radius.md }, dangerText: { color: Colors.danger, fontSize: Typography.small, fontWeight: "900" },
});
