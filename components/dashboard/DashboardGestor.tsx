import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useDashboardGestor } from "../../hooks/useDashboardGestor";
import { importarFaturaGeradora } from "../../services/usinas.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { AppHeader, Card, EmptyState, Loading, Metric, Screen, Section } from "../ui";
import RevenueChart from "./RevenueChart";

function formatarEnergia(valor: number) {
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;
}

function formatarPercentual(valor: number) {
  return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const atalhos = [
  { icon: "people-outline", label: "Clientes", rota: "/clientes" },
  { icon: "business-outline", label: "Usinas", rota: "/usinas" },
  { icon: "flash-outline", label: "Unidades", rota: "/unidades" },
  { icon: "document-text-outline", label: "Contratos", rota: "/contratos" },
  { icon: "receipt-outline", label: "Financeiro", rota: "/financeiro" },
] as const;

export default function DashboardGestor() {
  const { usuario, usinaSelecionada } = useAuth();
  const { data, isLoading, error, refetch } = useDashboardGestor();
  const [importando, setImportando] = useState(false);

  async function atualizarGeracao() {
    const usinaId = usinaSelecionada?.id ?? usuario?.usina_id;
    if (!usinaId) return Alert.alert("Usina não vinculada", "Escolha uma usina para importar a fatura geradora.");
    const arquivo = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
    if (arquivo.canceled) return;
    try {
      setImportando(true);
      const item = arquivo.assets[0];
      const resultado = await importarFaturaGeradora(usinaId, item.uri, item.name);
      await refetch();
      Alert.alert("Geração atualizada", `${formatarEnergia(resultado.dados.energiaInjetada)} importados para ${resultado.dados.referencia}.`);
    } catch (erro: any) {
      Alert.alert("Não foi possível atualizar", erro?.response?.data?.message ?? erro?.message ?? "Confira a fatura da unidade geradora.");
    } finally { setImportando(false); }
  }

  if (isLoading) return <Loading />;
  if (error || !data) return <Screen><View style={styles.errorContent}><EmptyState icon="alert-circle-outline" title="Não foi possível carregar a usina" subtitle="Verifique sua conexão e tente novamente." /></View></Screen>;

  return (
    <Screen>
      <AppHeader contextSubtitle={`Competência ${data.competencia}`} contextTitle="Visão geral da operação" icon="sunny-outline" subtitle="Sua energia em um só lugar" title={data.usina?.nome ?? "Minha usina"} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View><Text style={styles.heroEyebrow}>GERAÇÃO NO MÊS</Text><Text style={styles.heroValue}>{formatarEnergia(data.energiaGerada)}</Text></View>
            <View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>Operação ativa</Text></View>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progress, { width: `${Math.min(Math.max(Number(data.ocupacao), 0), 100)}%` }]} /></View>
          <View style={styles.heroBottom}><Text style={styles.heroCaption}>{formatarPercentual(data.ocupacao)} da energia alocada</Text><Text style={styles.heroCaption}>{formatarEnergia(data.energiaDisponivel)} disponíveis</Text></View>
          <Pressable disabled={importando} onPress={atualizarGeracao} style={styles.importButton}><Ionicons name="document-attach-outline" size={18} color={Colors.surface} /><Text style={styles.importText}>{importando ? "Lendo fatura..." : "Atualizar pela fatura da usina"}</Text></Pressable>
        </View>

        <Section title="Resumo da carteira">
          <View style={styles.grid}>
            <View style={styles.metric}><Metric compact icon={<Ionicons name="people-outline" size={20} color={Colors.primary} />} title="Clientes ativos" value={data.clientes} /></View>
            <View style={styles.metric}><Metric compact icon={<Ionicons name="analytics-outline" size={20} color={Colors.primary} />} title="Geração total" value={formatarEnergia(data.energiaTotal)} /></View>
            <View style={styles.metric}><Metric compact icon={<Ionicons name="wallet-outline" size={20} color={Colors.primary} />} title="Receita prevista" value={formatarMoeda(data.receitaPrevista)} /></View>
          </View>
        </Section>

        <Section title="Acesso rápido">
          <Card><View style={styles.actions}>{atalhos.map((atalho) => <Pressable key={atalho.label} onPress={() => router.push(atalho.rota as any)} style={styles.action}><View style={styles.actionIcon}><Ionicons name={atalho.icon} size={22} color={Colors.primary} /></View><Text style={styles.actionLabel}>{atalho.label}</Text></Pressable>)}</View></Card>
        </Section>

        <RevenueChart previsto={data.receitaPrevista} recebido={data.receitaRealizada} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 },
  errorContent: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  hero: { minHeight: 218, overflow: "hidden", justifyContent: "space-between", marginBottom: Spacing.xl, padding: Spacing.lg, borderRadius: Radius.xl, backgroundColor: Colors.primary, ...Shadows.card },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, heroEyebrow: { color: "#A7F3D0", fontSize: Typography.small, fontWeight: "700", letterSpacing: 1.1 },
  heroValue: { marginTop: Spacing.xs, color: Colors.surface, fontSize: 32, fontWeight: "800" }, status: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.sm, paddingVertical: 7, borderRadius: Radius.round, backgroundColor: "rgba(255,255,255,0.14)" },
  statusDot: { width: 7, height: 7, marginRight: 6, borderRadius: Radius.round, backgroundColor: "#34D399" }, statusText: { color: Colors.surface, fontSize: Typography.small, fontWeight: "700" },
  progressTrack: { height: 8, overflow: "hidden", marginTop: Spacing.xl, borderRadius: Radius.round, backgroundColor: "rgba(255,255,255,0.18)" }, progress: { height: "100%", borderRadius: Radius.round, backgroundColor: "#34D399" },
  heroBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: Spacing.sm }, heroCaption: { color: "#D1FAE5", fontSize: Typography.small },
  importButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: Spacing.md, borderRadius: Radius.md, backgroundColor: "rgba(15,143,91,0.88)" }, importText: { marginLeft: Spacing.xs, color: Colors.surface, fontSize: Typography.caption, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }, metric: { width: "48%" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md }, action: { width: "29%", alignItems: "center" }, actionIcon: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  actionLabel: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.small, fontWeight: "600", textAlign: "center" },
});
