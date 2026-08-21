import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";

import { AppHeader, Badge, Button, Card, Divider, ElasticScrollView as ScrollView, EmptyState, Loading, Metric, Screen, Section } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useDashboardUsina } from "../../hooks/useDashboardUsina";
import { Colors, Spacing, Typography } from "../../theme";

const energia = (v: unknown) => `${Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;
const moeda = (v: unknown) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function DashboardUsina() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useDashboardUsina(id);
  const [atualizando, setAtualizando] = useState(false);

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await refetch();
    } finally {
      setAtualizando(false);
    }
  }

  if (isLoading) return <Loading />;
  if (error || !data) return <Screen><View style={styles.state}><EmptyState icon="sunny-outline" title="Usina não encontrada" subtitle="Não foi possível carregar os dados desta usina." /></View></Screen>;
  const abrirRecebimentoDeProducao = () => {
    const unidadeGeradoraId = data.unidadeGeradora?.id;
    if (!unidadeGeradoraId) {
      Alert.alert("Unidade geradora não localizada", "Edite a usina e confirme o número da instalação para criar o endereço de recebimento.");
      return;
    }
    router.push({ pathname: "/unidades/recebimento-email", params: { unidadeId: unidadeGeradoraId, finalidade: "PRODUCAO_USINA" } });
  };

  return <Screen>
    {IS_GERADOR_APP ? <AppHeader variant="subpage" title="Usina" subtitle="Gestão de geração" contextTitle={data.usina?.nome ?? "Usina"} contextSubtitle={`UC ${data.usina?.numero_instalacao ?? "não informada"} · Competência ${data.competencia}`} icon="sunny-outline" /> : null}
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}><View style={styles.heading}><View><Text style={styles.eyebrow}>DETALHES DA USINA</Text><Text style={styles.title}>{data.usina?.nome ?? "Usina"}</Text><Text style={styles.subtitle}>Competência {data.competencia}</Text></View><Badge label={data.status ?? "ATIVA"} variant="success" /></View>
    <Card><Info icon="key-outline" label="Instalação" value={data.usina?.numero_instalacao ?? "Não informada"} /><Divider /><Info icon="flash-outline" label="Potência" value={`${Number(data.usina?.potencia_kwp ?? 0).toLocaleString("pt-BR")} kWp`} /><Divider /><Info icon="location-outline" label="Local" value={data.usina?.endereco ?? "Não informado"} /></Card>
    <Section title="Energia"><View style={styles.grid}><View style={styles.metric}><Metric compact title="Geração do mês" value={energia(data.energiaGerada)} icon={<Ionicons name="sunny-outline" size={20} color={Colors.primary} />} /></View><View style={styles.metric}><Metric compact title="Geração total" value={energia(data.energiaTotal)} icon={<Ionicons name="analytics-outline" size={20} color={Colors.primary} />} /></View><View style={styles.metric}><Metric compact title="Disponível" value={energia(data.energiaDisponivel)} icon={<Ionicons name="battery-half-outline" size={20} color={Colors.primary} />} /></View><View style={styles.metric}><Metric compact title="Ocupação" value={`${Number(data.ocupacao ?? 0).toFixed(1)}%`} icon={<Ionicons name="pie-chart-outline" size={20} color={Colors.primary} />} /></View></View></Section>
    <Section title="Financeiro"><Card><Info icon="wallet-outline" label="Receita prevista" value={moeda(data.receitaPrevista)} /><Divider /><Info icon="checkmark-circle-outline" label="Receita realizada" value={moeda(data.receitaRealizada)} /></Card></Section>
    {IS_GERADOR_APP ? <Button title="Receber produção por e-mail" icon={<Ionicons name="mail-unread-outline" size={20} color={Colors.surface} />} onPress={abrirRecebimentoDeProducao} style={styles.emailButton} /> : null}
    <Button title="Editar dados da usina" icon={<Ionicons name="create-outline" size={20} color={Colors.surface} />} onPress={() => router.push({ pathname: "/usinas/editar", params: { id } })} />
  </ScrollView></Screen>;
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { return <View style={styles.info}><View style={styles.infoIcon}><Ionicons name={icon} size={20} color={Colors.primary} /></View><View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>; }
const styles = StyleSheet.create({ content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, state: { flex: 1, justifyContent: "center", padding: Spacing.lg }, heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: Spacing.lg }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.xs, color: Colors.subtitle }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, metric: { width: "48%", marginBottom: Spacing.sm }, info: { minHeight: 58, flexDirection: "row", alignItems: "center" }, infoIcon: { width: 42, alignItems: "center" }, infoText: { flex: 1, marginLeft: Spacing.sm }, infoLabel: { color: Colors.subtitle, fontSize: Typography.small }, infoValue: { marginTop: 3, color: Colors.text, fontWeight: "700" }, emailButton: { marginBottom: Spacing.sm } });
