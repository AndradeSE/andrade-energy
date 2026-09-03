import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader, Badge, Button, Card, ElasticFlatList as FlatList, EmptyState, Loading, Metric, Screen, Section } from "../../components/ui";
import { listarFechamentos, obterResumoOperacao } from "../../services/fechamentos.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const energia = (valor: unknown) => `${Number(valor ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;
const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const competenciaNome = (valor: string) => {
  const [ano, mes] = valor.split("-");
  if (!ano || !mes) return valor;
  return new Date(Number(ano), Number(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(" de ", "/");
};

export default function Operacao() {
  const [resumo, setResumo] = useState<any>();
  const [lista, setLista] = useState<any[]>([]);
  const [competencia, setCompetencia] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async (alvo?: string) => {
    try {
      const [r, l] = await Promise.all([obterResumoOperacao(alvo), listarFechamentos()]);
      setResumo(r);
      setCompetencia(r.competencia);
      setLista((l ?? []).filter((item: any) => String(item.competencia ?? "").slice(0, 7) === r.competencia));
    } catch (error: any) {
      Alert.alert("Não foi possível carregar a operação", error?.response?.data?.message ?? "Verifique a conexão com o servidor e tente novamente.");
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(competencia); }, [carregar]));

  async function selecionarCompetencia(valor: string) { setCompetencia(valor); setLoading(true); await carregar(valor); }
  async function atualizarPagina() { setAtualizando(true); try { await carregar(competencia); } finally { setAtualizando(false); } }
  const percentualRecebido = resumo?.receitaPrevista > 0 ? Math.min(100, (resumo.receitaRecebida / resumo.receitaPrevista) * 100) : 0;
  const historico = useMemo(() => lista, [lista]);

  return <Screen><AppHeader title="Operação" subtitle="Fechamento mensal" contextTitle={competencia ? `Competência ${competenciaNome(competencia)}` : "Operação mensal"} contextSubtitle="Geração, rateio, faturamento e recebimentos" icon="analytics-outline" />
    {loading ? <Loading /> : <FlatList bounces alwaysBounceVertical overScrollMode="always" refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />} contentContainerStyle={styles.content} data={historico} keyExtractor={(item) => item.id}
      ListHeaderComponent={<View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{(resumo?.competencias ?? []).map((item: string) => <Pressable key={item} onPress={() => void selecionarCompetencia(item)} style={[styles.filter, competencia === item && styles.filterSelected]}><Text style={[styles.filterText, competencia === item && styles.filterTextSelected]}>{competenciaNome(item)}</Text></Pressable>)}</ScrollView>
        <View style={styles.heading}><Text style={styles.title}>Fechamento da competência</Text><Text style={styles.subtitle}>Dados consolidados automaticamente a partir da produção e das faturas.</Text></View>
        <View style={styles.grid}>
          <View style={styles.metric}><Metric compact title="Energia gerada" value={energia(resumo?.energiaGerada)} icon={<Ionicons name="sunny-outline" size={20} color={Colors.primary} />} /></View>
          <View style={styles.metric}><Metric compact title="Energia alocada" value={energia(resumo?.energiaAlocada)} icon={<Ionicons name="git-merge-outline" size={20} color={Colors.primary} />} /></View>
          <View style={styles.metric}><Metric compact title="Disponível" value={energia(resumo?.energiaDisponivel)} icon={<Ionicons name="battery-half-outline" size={20} color={Colors.primary} />} /></View>
          <View style={styles.metric}><Metric compact title="Ocupação" value={`${Number(resumo?.ocupacao ?? 0).toFixed(1)}%`} icon={<Ionicons name="pie-chart-outline" size={20} color={Colors.primary} />} /></View>
        </View>
        <Section title="Resultado financeiro"><Card style={styles.financialCard}>
          <View style={styles.financialTop}><View><Text style={styles.cardLabel}>RECEITA PREVISTA</Text><Text style={styles.revenue}>{moeda(resumo?.receitaPrevista)}</Text></View><Badge label={`${Number(percentualRecebido).toFixed(0)}% recebido`} variant={percentualRecebido >= 99 ? "success" : "warning"} /></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${percentualRecebido}%` }]} /></View>
          <View style={styles.financialRow}><SmallValue label="RECEBIDO" value={moeda(resumo?.receitaRecebida)} /><SmallValue label="PENDENTE" value={moeda(resumo?.receitaPendente)} /><SmallValue label="VENCIDAS" value={String(resumo?.faturasVencidas ?? 0)} /></View>
        </Card></Section>
        <Section title="Conferência"><View style={styles.grid}>
          <View style={styles.metric}><Metric compact title="Usinas processadas" value={`${resumo?.fechamentos ?? 0}/${resumo?.totalUsinas ?? 0}`} icon={<Ionicons name="business-outline" size={20} color={Colors.primary} />} /></View>
          <View style={styles.metric}><Metric compact title="Faturas emitidas" value={resumo?.totalFaturas ?? 0} icon={<Ionicons name="document-text-outline" size={20} color={Colors.primary} />} /></View>
          <View style={styles.metric}><Metric compact title="Faturas pagas" value={resumo?.faturasPagas ?? 0} icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />} /></View>
          <View style={styles.metric}><Metric compact title="Pendentes" value={resumo?.faturasPendentes ?? 0} icon={<Ionicons name="time-outline" size={20} color={Colors.primary} />} /></View>
        </View></Section>
        {(resumo?.alertas ?? []).length ? <Card style={styles.warningCard}><View style={styles.warningTitle}><Ionicons name="warning-outline" size={21} color={Colors.warning} /><Text style={styles.warningHeading}>Pendências antes do fechamento</Text></View>{resumo.alertas.map((alerta: string) => <Text key={alerta} style={styles.warningText}>• {alerta}</Text>)}</Card> : <Card style={styles.readyCard}><View style={styles.warningTitle}><Ionicons name="checkmark-circle" size={22} color={Colors.success} /><Text style={styles.readyHeading}>Competência conferida</Text></View><Text style={styles.readyText}>Produção e faturamento estão disponíveis para o fechamento.</Text></Card>}
        <Button title="Registrar ajuste excepcional" icon={<Ionicons name="create-outline" size={20} color={Colors.surface} />} onPress={() => router.push("/operacao/novo")} />
        <Text style={styles.historyTitle}>Usinas nesta competência</Text>
      </View>}
      renderItem={({ item }) => <Pressable onPress={() => router.push(`/operacao/${item.id}`)}><Card><View style={styles.row}><View style={styles.rowText}><Text numberOfLines={1} style={styles.name}>{item.usinas?.nome ?? "Usina"}</Text><Text style={styles.detail}>{energia(item.energia_gerada)} gerados · {energia(item.energia_alocada)} alocados</Text></View><Badge label={item.status ?? "FECHADO"} variant={item.status === "FECHADO" ? "success" : "warning"} /></View><View style={styles.cardBottom}><Text style={styles.cardMetric}>{moeda(item.receita_prevista)}</Text><Text style={styles.occupation}>{Number(item.ocupacao ?? 0).toFixed(1)}% ocupado</Text><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></View></Card></Pressable>}
      ListEmptyComponent={<EmptyState icon="analytics-outline" title="Nenhuma usina processada" subtitle="Importe a produção das usinas ou registre um ajuste excepcional." />}
    />}
  </Screen>;
}

function SmallValue({ label, value }: { label: string; value: string }) { return <View style={styles.smallValue}><Text style={styles.smallLabel}>{label}</Text><Text numberOfLines={1} style={styles.smallText}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, filters: { gap: Spacing.sm, paddingBottom: Spacing.lg }, filter: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.round, backgroundColor: Colors.surface }, filterSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary }, filterText: { color: Colors.subtitle, fontWeight: "700", textTransform: "capitalize" }, filterTextSelected: { color: Colors.surface }, heading: { marginBottom: Spacing.lg }, title: { color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, subtitle: { marginTop: Spacing.xs, color: Colors.subtitle, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: Spacing.sm }, metric: { width: "48%", marginBottom: Spacing.sm }, financialCard: { backgroundColor: Colors.primaryDark }, financialTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, cardLabel: { color: "#B7D3C5", fontSize: 10, fontWeight: "800", letterSpacing: 1 }, revenue: { marginTop: 6, color: Colors.surface, fontSize: 28, fontWeight: "900" }, progressTrack: { height: 7, marginVertical: Spacing.md, overflow: "hidden", borderRadius: Radius.round, backgroundColor: "rgba(255,255,255,0.18)" }, progressFill: { height: 7, borderRadius: Radius.round, backgroundColor: Colors.secondary }, financialRow: { flexDirection: "row", gap: Spacing.sm }, smallValue: { flex: 1 }, smallLabel: { color: "#B7D3C5", fontSize: 9, fontWeight: "800" }, smallText: { marginTop: 4, color: Colors.surface, fontSize: Typography.small, fontWeight: "800" },
  warningCard: { marginBottom: Spacing.md, borderColor: "#F2C46D", backgroundColor: "#FFF7E6" }, readyCard: { marginBottom: Spacing.md, borderColor: "#A9D5BA", backgroundColor: "#EDF8F1" }, warningTitle: { flexDirection: "row", alignItems: "center", gap: Spacing.sm }, warningHeading: { flex: 1, color: "#7A4A00", fontWeight: "800" }, warningText: { marginTop: Spacing.sm, color: "#7A5A24", lineHeight: 19 }, readyHeading: { color: Colors.primaryDark, fontWeight: "800" }, readyText: { marginTop: Spacing.sm, color: Colors.subtitle },
  historyTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md, color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, rowText: { flex: 1, marginRight: Spacing.sm }, name: { color: Colors.text, fontSize: Typography.body, fontWeight: "700" }, detail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small }, cardBottom: { flexDirection: "row", alignItems: "center", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, cardMetric: { flex: 1, color: Colors.text, fontWeight: "700" }, occupation: { marginRight: Spacing.sm, color: Colors.primary, fontSize: Typography.small, fontWeight: "700" },
});
