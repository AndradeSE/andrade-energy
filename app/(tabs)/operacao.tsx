import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, Badge, Button, Card, EmptyState, Loading, Metric, Screen } from "../../components/ui";
import { listarFechamentos, obterResumoOperacao } from "../../services/fechamentos.service";
import { Colors, Spacing, Typography } from "../../theme";

const energia = (valor: unknown) => `${Number(valor ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;
const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Operacao() {
  const [resumo, setResumo] = useState<any>(); const [lista, setLista] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const carregar = useCallback(async () => { try { const [r, l] = await Promise.all([obterResumoOperacao(), listarFechamentos()]); setResumo(r); setLista(l ?? []); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return <Screen><AppHeader title="Operação" subtitle="Fechamentos das usinas" contextTitle={`${resumo?.fechamentos ?? 0} competências processadas`} contextSubtitle="Geração, alocação e receita" icon="analytics-outline" />
    {loading ? <Loading /> : <FlatList contentContainerStyle={styles.content} data={lista} keyExtractor={(item) => item.id}
      ListHeaderComponent={<View><View style={styles.heading}><Text style={styles.title}>Visão operacional</Text><Text style={styles.subtitle}>Consolide a energia de cada competência.</Text></View><View style={styles.grid}>
        <View style={styles.metric}><Metric compact title="Energia gerada" value={energia(resumo?.energiaGerada)} icon={<Ionicons name="sunny-outline" size={20} color={Colors.primary} />} /></View>
        <View style={styles.metric}><Metric compact title="Disponível" value={energia(resumo?.energiaDisponivel)} icon={<Ionicons name="battery-half-outline" size={20} color={Colors.primary} />} /></View>
        <View style={styles.metric}><Metric compact title="Receita prevista" value={moeda(resumo?.receitaPrevista)} icon={<Ionicons name="wallet-outline" size={20} color={Colors.primary} />} /></View>
        <View style={styles.metric}><Metric compact title="Fechamentos" value={resumo?.fechamentos ?? 0} icon={<Ionicons name="checkmark-done-outline" size={20} color={Colors.primary} />} /></View>
      </View><Button title="Novo fechamento" icon={<Ionicons name="add" size={21} color={Colors.surface} />} onPress={() => router.push("/operacao/novo")} /><Text style={styles.historyTitle}>Histórico de competências</Text></View>}
      renderItem={({ item }) => <Pressable onPress={() => router.push(`/operacao/${item.id}`)}><Card><View style={styles.row}><View style={styles.rowText}><Text numberOfLines={1} style={styles.name}>{item.usinas?.nome ?? "Usina"}</Text><Text style={styles.detail}>{new Date(item.competencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</Text></View><Badge label={item.status ?? "FECHADO"} variant={item.status === "FECHADO" ? "success" : "warning"} /></View><View style={styles.cardBottom}><Text style={styles.cardMetric}>{energia(item.energia_gerada)}</Text><Text style={styles.occupation}>{Number(item.ocupacao ?? 0).toFixed(1)}% ocupado</Text><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></View></Card></Pressable>}
      ListEmptyComponent={<EmptyState icon="analytics-outline" title="Nenhum fechamento realizado" subtitle="Crie o primeiro fechamento ou importe a fatura da unidade geradora." />}
    />}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, heading: { marginBottom: Spacing.lg }, title: { color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, subtitle: { marginTop: Spacing.xs, color: Colors.subtitle },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: Spacing.md }, metric: { width: "48%", marginBottom: Spacing.sm }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, rowText: { flex: 1, marginRight: Spacing.sm }, name: { color: Colors.text, fontSize: Typography.body, fontWeight: "700" }, detail: { marginTop: 4, color: Colors.subtitle, textTransform: "capitalize" },
  historyTitle: { marginTop: Spacing.xl, marginBottom: Spacing.md, color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, cardBottom: { flexDirection: "row", alignItems: "center", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, cardMetric: { flex: 1, color: Colors.text, fontWeight: "700" }, occupation: { marginRight: Spacing.sm, color: Colors.primary, fontSize: Typography.small, fontWeight: "700" },
});
