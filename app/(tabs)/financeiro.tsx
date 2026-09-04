import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import AndradeBarChart from "../../components/charts/AndradeBarChart";
import { AppHeader, Button, Card, Divider, ElasticScrollView as ScrollView, Loading, Metric, Screen, Section } from "../../components/ui";
import * as FinanceiroService from "../../services/financeiro.service";
import * as CarteiraService from "../../services/carteira.service";
import { listarUnidadesGestor } from "../../services/clientes.service";
import { processarFatura } from "../../services/faturas.service";
import { useAuth } from "../../contexts/AuthContext";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const moeda = (valor: number) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Financeiro() {
  const { suspenderBloqueioTemporariamente } = useAuth();
  const [secaoAberta, setSecaoAberta] = useState<"carteira" | null>(null);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [dados, setDados] = useState({ receitaPrevista: 0, receitaRecebida: 0, valorEmAberto: 0, inadimplentes: 0, ticketMedio: 0, percentualRecebido: 0, totalFaturas: 0, historicoMensal: [] as { competencia: string; valor: number }[] });
  const [carteira, setCarteira] = useState<CarteiraService.Carteira | null>(null);
  const [unidadesRecebimento, setUnidadesRecebimento] = useState<any[]>([]);
  const [faturandoPdf, setFaturandoPdf] = useState(false);
  const [pixChave, setPixChave] = useState(""); const [pixTipo] = useState("EMAIL"); const [saque, setSaque] = useState("");
  const carregar = useCallback(async () => {
    try {
      const [financeiroResultado, carteiraResultado, unidadesResultado] = await Promise.allSettled([
        FinanceiroService.carregarFinanceiro(),
        CarteiraService.carregarCarteira(),
        listarUnidadesGestor(),
      ]);
      if (financeiroResultado.status === "rejected") throw financeiroResultado.reason;
      setDados(financeiroResultado.value);
      setCarteira(carteiraResultado.status === "fulfilled" ? carteiraResultado.value : null);
      setUnidadesRecebimento(unidadesResultado.status === "fulfilled" ? (unidadesResultado.value ?? []).filter((item: any) => {
        const usina = Array.isArray(item.usinas) ? item.usinas[0] : item.usinas;
        return String(item.tipo ?? "BENEFICIARIA").toUpperCase() !== "GERADORA" && String(usina?.titularidade_ucs_recebedoras ?? "GERADOR") === "GERADOR";
      }) : []);
    } catch (error: any) {
      setCarteira(null);
      Alert.alert(
        "Não foi possível carregar o financeiro",
        error?.response?.data?.message ?? "Verifique a conexão com o servidor e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));
  async function atualizarPagina() { setAtualizando(true); try { await carregar(); } finally { setAtualizando(false); } }

  async function faturarViaPdf() {
    if (faturandoPdf) return;
    const retomarBloqueio = suspenderBloqueioTemporariamente();
    try {
      const arquivo = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
      if (arquivo.canceled) return;
      setFaturandoPdf(true);
      const pdf = arquivo.assets[0];
      const resultado = await processarFatura(pdf.uri, pdf.name);
      if (resultado?.resultado?.clienteNaoEncontrado) {
        const uc = String(resultado?.resultado?.dadosCadastro?.uc ?? "");
        Alert.alert("UC ainda não cadastrada", `A unidade ${uc || "identificada na conta"} precisa ser vinculada antes do faturamento.`, [
          { text: "Cancelar", style: "cancel" },
          { text: "Cadastrar UC", onPress: () => router.push({ pathname: "/unidades/nova", params: { origem: "fatura", uc, cadastroRapido: "1" } }) },
        ]);
        return;
      }
      if (resultado?.resultado?.jaProcessada) {
        Alert.alert("Fatura já processada", "Esta competência já foi faturada para a unidade.");
        return;
      }
      await carregar();
      Alert.alert("Faturamento concluído", "A fatura foi processada e a cobrança foi gerada.");
    } catch (erro: any) {
      Alert.alert("Não foi possível faturar", erro?.response?.data?.message ?? erro?.message ?? "Confira o PDF e tente novamente.");
    } finally {
      setFaturandoPdf(false);
      retomarBloqueio();
    }
  }

  return <Screen><AppHeader collapsePlantContextOnMount title="Financeiro" subtitle="Receita da carteira" contextTitle={moeda(dados.receitaRecebida)} contextSubtitle={`${dados.percentualRecebido.toFixed(1)}% da receita recebida`} icon="wallet-outline" />
    {loading ? <Loading /> : <ScrollView bounces alwaysBounceVertical overScrollMode="always" refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Section title="Acesso rápido"><View style={styles.quickGrid}>
        <QuickAction icon="document-attach-outline" label={faturandoPdf ? "Processando PDF..." : "Faturamento via PDF"} active={faturandoPdf} onPress={() => void faturarViaPdf()} />
        <QuickAction icon="create-outline" label="Faturamento manual" onPress={() => router.push("/faturamento/criar-manual" as any)} />
        <QuickAction icon="swap-horizontal-outline" label="Transferir saldo" active={secaoAberta === "carteira"} onPress={() => setSecaoAberta(secaoAberta === "carteira" ? null : "carteira")} />
        <QuickAction icon="mail-unread-outline" label="Fatura automática" onPress={() => { const unidade = unidadesRecebimento[0]; if (!unidade?.id) return Alert.alert("Fatura automática", "Cadastre e vincule uma UC recebedora a uma usina antes de configurar o e-mail."); router.push({ pathname: "/unidades/recebimento-email", params: { unidadeId: unidade.id, escopo: "usina" } }); }} />
      </View></Section>
      {secaoAberta === "carteira" && carteira ? <Section title="Transferências de saldo"><Card style={styles.walletCard}><Text style={styles.walletLabel}>SALDO DISPONÍVEL</Text><Text style={styles.walletValue}>{moeda(carteira.saldoDisponivel)}</Text><Text style={styles.walletPending}>{moeda(carteira.saldoPendente)} a receber</Text></Card><Card><View style={styles.autoRow}><View style={styles.autoCopy}><Text style={styles.cardTitle}>Transferência automática</Text><Text style={styles.cardSubtitle}>Enviar para sua chave Pix sempre que receber.</Text></View><Switch value={carteira.transferenciaAutomatica} trackColor={{ false: Colors.border, true: Colors.primary }} onValueChange={async (value) => { try { const updated = await CarteiraService.salvarCarteira({ pixTipo: carteira.pixTipo ?? pixTipo, pixChave: pixChave || undefined, transferenciaAutomatica: value }); setCarteira(updated); setPixChave(""); } catch (error: any) { Alert.alert("Carteira", error?.response?.data?.message ?? "Cadastre sua chave Pix primeiro."); } }} /></View><Divider /><Text style={styles.inputLabel}>Chave Pix deste gerador</Text><TextInput style={styles.input} autoCapitalize="none" value={pixChave} onChangeText={setPixChave} placeholder={carteira.pixChaveMascarada ?? "E-mail, CPF ou chave"} /><Button title="Salvar chave Pix" onPress={async () => { try { const updated = await CarteiraService.salvarCarteira({ pixTipo, pixChave, transferenciaAutomatica: carteira.transferenciaAutomatica }); setCarteira(updated); setPixChave(""); Alert.alert("Carteira", "Chave salva com segurança."); } catch (error: any) { Alert.alert("Carteira", error?.response?.data?.message ?? "Não foi possível salvar."); } }} /><Divider /><Text style={styles.inputLabel}>Transferência manual</Text><TextInput style={styles.input} keyboardType="decimal-pad" value={saque} onChangeText={setSaque} placeholder="Valor" /><Button title="Transferir saldo" disabled={!carteira.pixChaveMascarada || carteira.saldoDisponivel <= 0} onPress={() => { const valor = Number(saque.replace(",", ".")); if (!(valor > 0)) return; Alert.alert("Confirmar Pix", `Transferir ${moeda(valor)} para ${carteira.pixChaveMascarada}?`, [{ text: "Cancelar", style: "cancel" }, { text: "Transferir", onPress: async () => { try { await CarteiraService.transferir(valor); setSaque(""); await carregar(); Alert.alert("Carteira", "Transferência solicitada."); } catch (error: any) { Alert.alert("Carteira", error?.response?.data?.message ?? "Transferência não concluída."); } } }]); }} /></Card></Section> : null}
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
function QuickAction({ icon, label, active = false, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean; onPress: () => void }) { return <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[styles.quickAction, active && styles.quickActionActive]}><View style={styles.quickIcon}><Ionicons name={icon} size={23} color={Colors.primary} /></View><Text style={styles.quickLabel}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, billingButton: { marginBottom: Spacing.lg }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, metric: { width: "48%", marginBottom: Spacing.sm },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm }, quickAction: { width: "48%", aspectRatio: 1.35, alignItems: "center", justifyContent: "center", padding: Spacing.sm, borderWidth: 1, borderColor: "#C9DED1", borderRadius: Radius.lg, backgroundColor: Colors.surface }, quickActionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight }, quickIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, quickLabel: { marginTop: Spacing.sm, color: Colors.text, fontSize: Typography.small, fontWeight: "800", textAlign: "center" },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardTitle: { color: Colors.text, fontSize: Typography.card, fontWeight: "700" }, cardSubtitle: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small }, percent: { color: Colors.primary, fontSize: Typography.section, fontWeight: "800" },
  track: { height: 10, overflow: "hidden", marginTop: Spacing.lg, borderRadius: Radius.round, backgroundColor: Colors.border }, progress: { height: "100%", borderRadius: Radius.round, backgroundColor: Colors.primary },
  info: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, infoLabel: { color: Colors.subtitle }, infoValue: { color: Colors.text, fontWeight: "700" }, warning: { color: Colors.danger },
  walletCard: { backgroundColor: "#083f31" }, walletLabel: { color: "#9FE0BF", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 }, walletValue: { marginTop: 8, color: "#FFFFFF", fontSize: 36, fontWeight: "900" }, walletPending: { marginTop: 5, color: "#CDEBDD" }, autoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }, autoCopy: { flex: 1 }, inputLabel: { marginBottom: 6, color: Colors.text, fontWeight: "700" }, input: { minHeight: 48, marginBottom: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, color: Colors.text, backgroundColor: Colors.background },
  emailListTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm, color: Colors.subtitle, fontSize: 10, fontWeight: "900", letterSpacing: .8 }, emailUnit: { minHeight: 66, flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm, padding: Spacing.sm, borderWidth: 1, borderColor: "#C9DED1", borderRadius: Radius.lg, backgroundColor: Colors.surface }, emailUnitIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, emailUnitCopy: { flex: 1, marginLeft: Spacing.sm }, emailUnitNumber: { color: Colors.text, fontSize: Typography.small, fontWeight: "900" }, emailUnitClient: { marginTop: 3, color: Colors.subtitle, fontSize: 11 }, emailUnitAction: { flexDirection: "row", alignItems: "center", gap: 2 }, emailUnitActionText: { color: Colors.primary, fontSize: 11, fontWeight: "900" },
});
