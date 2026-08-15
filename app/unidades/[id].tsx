import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Badge, Card, EmptyState, Loading, Metric, Screen, Section } from "../../components/ui";
import { excluirFatura, listarFaturas } from "../../services/faturas.service";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const paga = (status?: string) => ["PAGA", "PAGO", "QUITADA"].includes(String(status ?? "").toUpperCase());

export default function UnidadeDocumentos() {
  const { id, numero, cliente, titular, distribuidora } = useLocalSearchParams<{ id: string; numero?: string; cliente?: string; titular?: string; distribuidora?: string }>();
  const [unidade, setUnidade] = useState<any>();
  const [faturas, setFaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      let dados: any;
      if (!id.startsWith("cliente-")) {
        const resultado = await supabase.from("unidades_consumidoras").select("*, clientes(nome)").eq("id", id).maybeSingle();
        dados = resultado.data;
      }
      dados ??= numero ? { id, numero, titular, distribuidora, clientes: { nome: cliente } } : null;
      if (!dados) return;
      setUnidade(dados);
      setFaturas((await listarFaturas(undefined, dados.numero)) ?? []);
    }
    carregar().catch(() => Alert.alert("Não foi possível carregar", "Confira sua conexão e tente novamente.")).finally(() => setLoading(false));
  }, [cliente, distribuidora, id, numero, titular]);

  async function abrirConta(item: any) {
    if (!item.pdf_cemig_url) return Alert.alert("PDF em preparação", "A conta da concessionária ainda não está disponível.");
    try { await Linking.openURL(item.pdf_cemig_url); } catch { Alert.alert("Não foi possível abrir", "Confira sua conexão e tente novamente."); }
  }

  function confirmarExclusao(item: any) {
    Alert.alert("Excluir fatura", `Deseja excluir a fatura ${item.referencia || "selecionada"}? Esta ação não pode ser desfeita.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
        try { await excluirFatura(item.id); setFaturas((atuais) => atuais.filter((fatura) => fatura.id !== item.id)); }
        catch (erro: any) { Alert.alert("Não foi possível excluir", erro?.response?.data?.message ?? erro?.message); }
      } },
    ]);
  }

  if (loading) return <Loading />;
  if (!unidade) return <Screen><View style={styles.state}><EmptyState icon="flash-outline" title="Unidade não encontrada" subtitle="Não foi possível carregar esta unidade consumidora." /></View></Screen>;
  const economiaTotal = faturas.reduce((total, item) => total + Number(item.economia_real ?? item.economia ?? 0), 0);
  const valorFaturado = faturas.reduce((total, item) => total + Number(item.valor_total_unificado ?? item.valor_total ?? 0), 0);
  const consumoTotal = faturas.reduce((total, item) => total + Number(item.consumo_kwh ?? item.consumo ?? 0), 0);

  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color={Colors.text} /></TouchableOpacity>
    <Text style={styles.eyebrow}>UNIDADE CONSUMIDORA</Text><Text style={styles.title}>UC {unidade.numero}</Text><Text style={styles.subtitle}>{unidade.clientes?.nome ?? unidade.titular ?? "Cliente"}</Text>

    <Section title="Estatísticas da unidade"><View style={styles.metrics}><View style={styles.metric}><Metric compact title="Economia total" value={moeda(economiaTotal)} icon={<Ionicons name="trending-up-outline" size={20} color={Colors.primary} />} /></View><View style={styles.metric}><Metric compact title="Total faturado" value={moeda(valorFaturado)} icon={<Ionicons name="wallet-outline" size={20} color={Colors.primary} />} /></View><View style={styles.metric}><Metric compact title="Consumo acumulado" value={`${consumoTotal.toLocaleString("pt-BR")} kWh`} icon={<Ionicons name="flash-outline" size={20} color={Colors.primary} />} /></View><View style={styles.metric}><Metric compact title="Faturas processadas" value={faturas.length} icon={<Ionicons name="receipt-outline" size={20} color={Colors.primary} />} /></View></View></Section>

    <Section title="Contas da concessionária"><View>{faturas.length ? faturas.map((item) => <TouchableOpacity key={`conta-${item.id}`} activeOpacity={0.84} onPress={() => abrirConta(item)}><Card><View style={styles.row}><View style={styles.icon}><Ionicons name="document-text-outline" size={22} color={Colors.primary} /></View><View style={styles.info}><Text style={styles.itemTitle}>{item.referencia || "Conta de luz"}</Text><Text style={styles.itemDetail}>{item.pdf_cemig_url ? "PDF disponível" : "PDF em preparação"}</Text></View><Ionicons name={item.pdf_cemig_url ? "download-outline" : "time-outline"} size={21} color={item.pdf_cemig_url ? Colors.primary : Colors.subtitle} /></View></Card></TouchableOpacity>) : <EmptyState icon="document-outline" title="0 contas da concessionária" subtitle="As contas desta UC aparecerão aqui quando forem importadas." />}</View></Section>

    <Section title="Faturas Andrade Energy"><View>{faturas.length ? faturas.map((item) => <TouchableOpacity key={`fatura-${item.id}`} activeOpacity={0.84} onPress={() => router.push(`/faturas/${item.id}`)}><Card><View style={styles.invoiceTop}><View><Text style={styles.invoiceValue}>{moeda(item.valor_total_unificado ?? item.valor_total)}</Text><Text style={styles.itemDetail}>{item.referencia || "Competência não informada"}</Text></View><Badge label={paga(item.status) ? "Paga" : "Em aberto"} variant={paga(item.status) ? "success" : "warning"} /></View><View style={styles.invoiceBottom}><Text style={styles.invoiceDate}>{paga(item.status) ? "Pagamento confirmado" : `Vencimento ${item.vencimento || "não informado"}`}</Text><TouchableOpacity accessibilityLabel={`Excluir fatura ${item.referencia}`} onPress={(evento) => { evento.stopPropagation(); confirmarExclusao(item); }} style={styles.deleteInvoice}><Ionicons name="trash-outline" size={19} color={Colors.danger} /></TouchableOpacity><Ionicons name="chevron-forward" size={19} color={Colors.primary} /></View></Card></TouchableOpacity>) : <EmptyState icon="receipt-outline" title="0 faturas" subtitle="As faturas Andrade Energy desta UC aparecerão aqui após o faturamento." />}</View></Section>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, state: { flex: 1, justifyContent: "center", padding: Spacing.lg }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md, borderRadius: Radius.round, backgroundColor: Colors.surface }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.1 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "900" }, subtitle: { marginTop: 4, marginBottom: Spacing.lg, color: Colors.subtitle }, metrics: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, metric: { width: "48%", marginBottom: Spacing.sm }, row: { flexDirection: "row", alignItems: "center" }, icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, info: { flex: 1, marginHorizontal: Spacing.sm }, itemTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, itemDetail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small }, invoiceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, invoiceValue: { color: Colors.text, fontSize: Typography.body, fontWeight: "900" }, invoiceBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, invoiceDate: { flex: 1, color: Colors.subtitle, fontSize: Typography.small }, deleteInvoice: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs, borderRadius: Radius.round, backgroundColor: "#FEE2E2" },
});
