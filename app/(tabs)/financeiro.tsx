import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import AndradeBarChart from "../../components/charts/AndradeBarChart";
import { AppHeader, Card, Divider, Loading, Metric, Screen, Section } from "../../components/ui";
import * as FinanceiroService from "../../services/financeiro.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const moeda = (valor: number) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Financeiro() {
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({ receitaPrevista: 0, receitaRecebida: 0, valorEmAberto: 0, inadimplentes: 0, ticketMedio: 0, percentualRecebido: 0, totalFaturas: 0, historicoMensal: [] as { competencia: string; valor: number }[] });
  const carregar = useCallback(async () => { try { setDados(await FinanceiroService.carregarFinanceiro()); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return <Screen><AppHeader title="Financeiro" subtitle="Receita da carteira" contextTitle={moeda(dados.receitaRecebida)} contextSubtitle={`${dados.percentualRecebido.toFixed(1)}% da receita recebida`} icon="wallet-outline" />
    {loading ? <Loading /> : <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Section title="Resumo financeiro"><View style={styles.grid}>
        <View style={styles.metric}><Metric compact title="Receita prevista" value={moeda(dados.receitaPrevista)} icon={<Ionicons name="trending-up-outline" size={20} color={Colors.primary} />} /></View>
        <View style={styles.metric}><Metric compact title="Recebido" value={moeda(dados.receitaRecebida)} icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />} /></View>
        <View style={styles.metric}><Metric compact title="Em aberto" value={moeda(dados.valorEmAberto)} icon={<Ionicons name="time-outline" size={20} color={Colors.warning} />} /></View>
        <View style={styles.metric}><Metric compact title="Faturas" value={dados.totalFaturas} icon={<Ionicons name="receipt-outline" size={20} color={Colors.primary} />} /></View>
      </View></Section>

      <Card><View style={styles.progressHeader}><View><Text style={styles.cardTitle}>Recebimento</Text><Text style={styles.cardSubtitle}>Percentual realizado da carteira</Text></View><Text style={styles.percent}>{dados.percentualRecebido.toFixed(1)}%</Text></View><View style={styles.track}><View style={[styles.progress, { width: `${Math.min(Math.max(dados.percentualRecebido, 0), 100)}%` }]} /></View></Card>

      <Section title="Evolução do faturamento"><AndradeBarChart title="Receita por competência" subtitle="Valores faturados por mês" data={dados.historicoMensal.map((item) => ({ label: item.competencia.split("/")[0], value: item.valor }))} /></Section>

      <Section title="Indicadores"><Card><Info label="Ticket médio" value={moeda(dados.ticketMedio)} /><Divider /><Info label="Inadimplentes" value={String(dados.inadimplentes)} warning={dados.inadimplentes > 0} /><Divider /><Info label="Valor em aberto" value={moeda(dados.valorEmAberto)} /></Card></Section>
    </ScrollView>}
  </Screen>;
}

function Info({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={[styles.infoValue, warning && styles.warning]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, metric: { width: "48%", marginBottom: Spacing.sm },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardTitle: { color: Colors.text, fontSize: Typography.card, fontWeight: "700" }, cardSubtitle: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small }, percent: { color: Colors.primary, fontSize: Typography.section, fontWeight: "800" },
  track: { height: 10, overflow: "hidden", marginTop: Spacing.lg, borderRadius: Radius.round, backgroundColor: Colors.border }, progress: { height: "100%", borderRadius: Radius.round, backgroundColor: Colors.primary },
  info: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, infoLabel: { color: Colors.subtitle }, infoValue: { color: Colors.text, fontWeight: "700" }, warning: { color: Colors.danger },
});
