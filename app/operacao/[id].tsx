import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppHeader, Badge, Card, Divider, ElasticScrollView as ScrollView, EmptyState, Loading, Screen, Section } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarFechamento } from "../../services/fechamentos.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const energia = (valor: unknown) => `${Number(valor ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;
const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function DetalheFechamento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fechamento, setFechamento] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const carregar = useCallback(async () => { try { setFechamento(await buscarFechamento(id)); } catch (error: any) { setFechamento(undefined); Alert.alert("Não foi possível carregar o fechamento", error?.response?.data?.message ?? "Confira sua conexão e tente novamente."); } finally { setLoading(false); } }, [id]);
  useEffect(() => { void carregar(); }, [carregar]);

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await carregar();
    } finally {
      setAtualizando(false);
    }
  }
  if (loading) return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Fechamento operacional" subtitle="Operação da usina" contextTitle="Fechamento operacional" contextSubtitle="Carregando competência" icon="analytics-outline" /> : null}<Loading /></Screen>;
  if (!fechamento) return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Fechamento operacional" subtitle="Operação da usina" contextTitle="Fechamento operacional" contextSubtitle="Competência não encontrada" icon="analytics-outline" /> : null}<View style={styles.state}><EmptyState icon="alert-circle-outline" title="Fechamento não encontrado" subtitle="Não foi possível carregar esta competência." /></View></Screen>;

  const compensacoes = Array.isArray(fechamento.compensacoes_faturas) ? fechamento.compensacoes_faturas : [];
  const competencia = new Date(fechamento.competencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Fechamento operacional" subtitle="Operação da usina" contextTitle={fechamento.usinas?.nome ?? "Usina"} contextSubtitle={`Competência ${competencia}`} icon="analytics-outline" /> : null}<ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}>
    <View style={styles.heading}><View style={styles.headingText}><Text style={styles.eyebrow}>FECHAMENTO OPERACIONAL</Text><Text style={styles.title}>{fechamento.usinas?.nome ?? "Usina"}</Text><Text style={styles.subtitle}>{competencia}</Text></View><Badge label={fechamento.status ?? "FECHADO"} variant={fechamento.status === "FECHADO" ? "success" : "warning"} /></View>
    <Card><Info icon="sunny-outline" label="Energia gerada" value={energia(fechamento.energia_gerada)} /><Divider /><Info icon="git-merge-outline" label={fechamento.status === "ABERTO" ? "Alocação projetada" : "Energia alocada registrada"} value={energia(fechamento.energia_alocada)} /><Divider /><Info icon="battery-half-outline" label={fechamento.status === "ABERTO" ? "Disponível na projeção" : "Energia disponível"} value={energia(fechamento.energia_disponivel)} /><Divider /><Info icon="pie-chart-outline" label="Ocupação" value={`${Number(fechamento.ocupacao ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} /></Card>
    <Section title="Faturamento dos clientes"><Card><Info icon="document-text-outline" label="Faturado nesta competência" value={moeda(fechamento.receita_prevista_faturas)} /><Divider /><Info icon="checkmark-circle-outline" label="Recebido" value={moeda(fechamento.receita_recebida_faturas)} /><Divider /><Info icon="time-outline" label="Pendente" value={moeda(fechamento.receita_pendente_faturas)} /></Card></Section>
    <Section title="Compensação nas faturas"><Text style={styles.subtitle}>Energia compensada e injeção identificadas nas faturas dos clientes desta usina. Os dados aparecem automaticamente após o processamento das faturas desta competência; os ciclos de leitura podem ser diferentes.</Text><View>{compensacoes.length ? compensacoes.map((item: any) => <Card key={item.id}><Text style={styles.clientName}>{item.cliente}</Text><Text style={styles.clientUc}>{item.uc ? `UC ${item.uc}` : "UC não informada"}</Text><Divider /><Value label="ENERGIA COMPENSADA" value={energia(item.energia_compensada)} />{item.energia_injetada != null ? <Value label="INJEÇÃO REGISTRADA NA FATURA" value={energia(item.energia_injetada)} /> : null}{item.economia != null ? <Value label="ECONOMIA REGISTRADA" value={moeda(item.economia)} /> : null}</Card>) : <EmptyState icon="document-text-outline" title="Sem compensação identificada nas faturas" subtitle="Não há fatura válida com energia compensada informada nesta competência. Os dados aparecerão após o processamento das faturas que informarem compensação." />}</View></Section>
  </ScrollView></Screen>;
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { return <View style={styles.info}><View style={styles.infoIcon}><Ionicons name={icon} size={20} color={Colors.primary} /></View><View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>; }
function Value({ label, value }: { label: string; value: string }) { return <View style={styles.value}><Text style={styles.valueLabel}>{label}</Text><Text style={styles.valueText}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, state: { flex: 1, justifyContent: "center", padding: Spacing.lg }, heading: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.lg }, headingText: { flex: 1, marginRight: Spacing.sm }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.1 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, subtitle: { marginTop: 4, color: Colors.subtitle, textTransform: "capitalize" }, info: { minHeight: 58, flexDirection: "row", alignItems: "center" }, infoIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, infoText: { flex: 1, marginLeft: Spacing.sm }, infoLabel: { color: Colors.subtitle, fontSize: Typography.small }, infoValue: { marginTop: 3, color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, rateioTop: { flexDirection: "row", alignItems: "center" }, clientIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.primaryLight }, clientInfo: { flex: 1, marginLeft: Spacing.sm }, clientName: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, clientUc: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small }, rateioValues: { flexDirection: "row", gap: Spacing.md }, value: { flex: 1 }, valueLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800" }, valueText: { marginTop: 4, color: Colors.text, fontWeight: "800" },
});
