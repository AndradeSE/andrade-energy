import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AppHeader, Badge, Card, ElasticScrollView as ScrollView, EmptyState, Loading, Metric, Screen, Section } from "../../components/ui";
import { excluirFatura, formatarDataBrasileira, listarFaturas } from "../../services/faturas.service";
import { buscarCliente, buscarUnidade, excluirUnidadeCliente } from "../../services/clientes.service";
import { buscarUsina } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { IS_GERADOR_APP } from "../../config/appVariant";

const moeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const paga = (status?: string) => ["PAGA", "PAGO", "QUITADA"].includes(String(status ?? "").toUpperCase());

export default function UnidadeDocumentos() {
  const { id, numero, clienteId, cliente, usinaId, usinaNome, titular, distribuidora } = useLocalSearchParams<{ id: string; numero?: string; clienteId?: string; cliente?: string; usinaId?: string; usinaNome?: string; titular?: string; distribuidora?: string }>();
  const [unidade, setUnidade] = useState<any>();
  const [faturas, setFaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async (porAtualizacao = false) => {
    if (porAtualizacao) setAtualizando(true);
    try {
      let dados: any;
      const idSintetico = String(id ?? "").startsWith("cliente-");
      if (id && !idSintetico) {
        try {
          dados = await buscarUnidade(id);
        } catch {
          // Durante uma atualização do servidor, ainda conseguimos abrir a
          // UC com os dados seguros enviados pela lista anterior.
          dados = null;
        }
      }

      dados ??= numero ? {
        id,
        numero,
        titular,
        distribuidora,
        cliente_id: clienteId || (idSintetico ? String(id).replace("cliente-", "") : null),
        usina_id: usinaId || null,
        clientes: cliente ? { id: clienteId, nome: cliente } : null,
        usinas: usinaNome ? { id: usinaId, nome: usinaNome } : null,
      } : null;
      if (!dados) {
        setUnidade(undefined);
        return;
      }

      // Alguns atalhos antigos chegam somente com a UC. Recuperamos o vínculo
      // canônico antes de desenhar a tela para não esconder uma usina já
      // alocada nem bloquear o acesso ao contrato.
      let clienteVinculado: any = dados.clientes;
      let idUsinaVinculada = dados.usina_id ?? usinaId ?? null;
      if ((!dados.cliente_id || !idUsinaVinculada) && (dados.cliente_id ?? clienteId)) {
        try {
          clienteVinculado = await buscarCliente(String(dados.cliente_id ?? clienteId));
          idUsinaVinculada ??= clienteVinculado?.usina_id ?? null;
        } catch {
          // Mantém os dados já obtidos para a tela continuar utilizável offline.
        }
      }
      if (idUsinaVinculada && !dados.usinas?.nome) {
        try {
          const usinaVinculada = await buscarUsina(String(idUsinaVinculada));
          dados = { ...dados, usinas: usinaVinculada };
        } catch {
          // O ID ainda identifica uma alocação válida mesmo se o nome falhar.
        }
      }
      dados = {
        ...dados,
        cliente_id: dados.cliente_id ?? clienteVinculado?.id ?? clienteId ?? null,
        usina_id: idUsinaVinculada,
        clientes: dados.clientes ?? clienteVinculado ?? null,
      };
      setUnidade(dados);
      setFaturas((await listarFaturas(undefined, dados.numero)) ?? []);
    } catch (erro: any) {
      if (!porAtualizacao) {
        Alert.alert("Não foi possível carregar", erro?.response?.data?.message ?? "Confira sua conexão e tente novamente.");
      }
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  }, [cliente, clienteId, distribuidora, id, numero, titular, usinaId, usinaNome]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

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

  function confirmarExclusaoUnidade() {
    if (String(unidade?.id ?? "").startsWith("cliente-")) {
      Alert.alert("Unidade pendente", "Esta UC ainda não possui um cadastro próprio. Abra Configurar UC para concluir ou corrigir o vínculo.");
      return;
    }

    Alert.alert("Excluir unidade consumidora", `Deseja excluir a UC ${unidade?.numero}? A configuração de recebimento automático será removida. Faturas e contratos já criados serão preservados, mas deixarão de estar vinculados a esta UC.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir UC",
        style: "destructive",
        onPress: async () => {
          try {
            await excluirUnidadeCliente(unidade.id);
            Alert.alert("UC excluída", "A unidade consumidora foi removida.", [{ text: "OK", onPress: () => {
              // Retorna à lista de onde a UC foi aberta (cliente ou carteira),
              // em vez de trocar para a lista paralela de Unidades.
              if (router.canGoBack()) router.back();
              else router.replace("/unidades/index");
            } }]);
          } catch (erro: any) {
            const codigo = erro?.response?.status ?? "sem resposta";
            const base = String(erro?.config?.baseURL ?? "");
            const rota = String(erro?.config?.url ?? "");
            const detalhe = String(erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
            Alert.alert("Não foi possível excluir", `${detalhe}\n\nCódigo ${codigo}.\n\nServidor usado:\n${base}${rota}`);
          }
        },
      },
    ]);
  }

  if (loading) return <Loading />;
  if (!unidade) return <Screen><View style={styles.state}><EmptyState icon="flash-outline" title="Unidade não encontrada" subtitle="Não foi possível carregar esta unidade consumidora." /></View></Screen>;
  const economiaTotal = faturas.reduce((total, item) => total + Number(item.economia_real ?? item.economia ?? 0), 0);
  const valorFaturado = faturas.reduce((total, item) => total + Number(item.valor_total_unificado ?? item.valor_total ?? 0), 0);
  const consumoTotal = faturas.reduce((total, item) => total + Number(item.consumo_kwh ?? item.consumo ?? 0), 0);

  const status = String(unidade.status ?? "ATIVA").toUpperCase();
  // O vínculo é determinado pelo ID da usina. Em alguns acessos a partir de
  // listas antigas, o nome relacionado pode chegar no próximo carregamento;
  // nesse intervalo a UC já está alocada e não deve aparecer como pendente.
  const nomeUsinaVinculada = unidade.usinas?.nome ?? unidade.usina_nome ?? usinaNome ?? (unidade.usina_id ? "Usina vinculada - atualize para ver o nome" : "Ainda não alocada");

  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Unidade consumidora" subtitle="Gestão da carteira" contextTitle={`UC ${unidade.numero}`} contextSubtitle={unidade.clientes?.nome ?? unidade.titular ?? "Unidade consumidora"} icon="flash-outline" /> : null}<ScrollView refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => carregar(true)} tintColor={Colors.primary} colors={[Colors.primary]} />} contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={19} color={Colors.subtitle} /><Text style={styles.backLabel}>Voltar</Text></TouchableOpacity>

    <Card style={styles.unitHero}>
      <View style={styles.unitHeroTop}>
        <View style={styles.unitIcon}><Ionicons name="flash-outline" size={23} color={Colors.primary} /></View>
        <View style={styles.unitCopy}><Text style={styles.unitEyebrow}>UNIDADE CONSUMIDORA</Text><Text style={styles.unitTitle}>UC {unidade.numero}</Text><Text numberOfLines={1} style={styles.unitOwner}>{unidade.clientes?.nome ?? unidade.titular ?? "Cliente não informado"}</Text></View>
        <Badge label={status} variant={status === "INATIVA" ? "danger" : "success"} />
      </View>
      <View style={styles.heroDivider} />
      <UnitMeta icon="business-outline" label="Concessionária" value={unidade.distribuidora ?? "Não informada"} />
      <UnitMeta icon="sunny-outline" label="Usina vinculada" value={nomeUsinaVinculada} last />
    </Card>

      <View style={styles.actions}>
      <TouchableOpacity activeOpacity={0.84} accessibilityLabel="Configurar unidade consumidora" onPress={() => {
        const clienteIdParaEdicao = unidade.cliente_id ?? (String(unidade.id).startsWith("cliente-") ? String(unidade.id).replace("cliente-", "") : "");
        if (!clienteIdParaEdicao) {
          Alert.alert("Vincule a UC a um cliente", "Esta unidade ainda não possui cliente vinculado. Abra o cadastro da UC, escolha o cliente e salve antes de fazer a alocação.");
          return;
        }
        router.push({
          pathname: "/unidades/editar",
          params: {
            id: unidade.id,
            numero: unidade.numero,
            clienteId: clienteIdParaEdicao,
            usinaId: unidade.usina_id ?? "",
            modalidade: unidade.modalidade_faturamento ?? "",
            desconto: unidade.desconto_percentual === null || unidade.desconto_percentual === undefined ? "" : String(unidade.desconto_percentual),
            consumoMedio: unidade.consumo_medio_kwh === null || unidade.consumo_medio_kwh === undefined ? "" : String(unidade.consumo_medio_kwh),
          },
        });
      }} style={styles.action}><Ionicons name="options-outline" size={18} color={Colors.primary} /><Text style={styles.actionText}>Configurar UC</Text></TouchableOpacity>
      {IS_GERADOR_APP ? <TouchableOpacity activeOpacity={0.84} accessibilityLabel="Adicionar ou editar contrato da unidade" onPress={() => {
        if (String(unidade.id ?? "").startsWith("cliente-")) {
          Alert.alert("Finalize o cadastro da UC", "Abra Configurar UC e salve a unidade antes de cadastrar ou anexar o contrato.");
          return;
        }
        router.push({ pathname: "/unidades/contrato", params: {
          id: unidade.id,
          numero: unidade.numero,
          clienteId: unidade.cliente_id ?? unidade.clientes?.id ?? clienteId ?? "",
          cliente: unidade.clientes?.nome ?? unidade.titular ?? cliente ?? "",
          descontoPadrao: String(unidade.desconto_percentual ?? ""),
        } });
      }} style={styles.action}><Ionicons name="document-text-outline" size={18} color={Colors.primary} /><Text style={styles.actionText}>Contrato</Text></TouchableOpacity> : null}
    </View>
    {IS_GERADOR_APP && !String(unidade.id ?? "").startsWith("cliente-") ? <TouchableOpacity activeOpacity={0.84} accessibilityLabel="Configurar recebimento automático de faturas" onPress={() => router.push({ pathname: "/unidades/recebimento-email", params: { unidadeId: unidade.id } })} style={styles.automaticInvoice}><Ionicons name={unidade.recebimento_email_ativo ? "mail-open-outline" : "mail-unread-outline"} size={19} color={Colors.primary} /><View style={styles.automaticInvoiceCopy}><Text style={styles.automaticInvoiceTitle}>{unidade.recebimento_email_ativo ? "Gerenciar fatura automática" : "Ativar fatura automática"}</Text><Text style={styles.automaticInvoiceSubtitle}>{unidade.recebimento_email_ativo ? "Ver endereço exclusivo ou desativar o recebimento." : "Receba contas da CEMIG por e-mail nesta UC."}</Text></View><Ionicons name="chevron-forward" size={19} color={Colors.primary} /></TouchableOpacity> : null}
    {IS_GERADOR_APP ? <TouchableOpacity activeOpacity={0.84} accessibilityLabel="Excluir unidade consumidora" onPress={confirmarExclusaoUnidade} style={styles.deleteUnit}><Ionicons name="trash-outline" size={18} color={Colors.danger} /><Text style={styles.deleteUnitText}>Excluir unidade consumidora</Text></TouchableOpacity> : null}

    <Section title="Estatísticas da unidade"><View style={styles.metrics}><View style={styles.metric}><Metric compact title="Economia total" value={moeda(economiaTotal)} icon={<Ionicons name="trending-up-outline" size={20} color={Colors.primary} />} /></View><View style={styles.metric}><Metric compact title="Total faturado" value={moeda(valorFaturado)} icon={<Ionicons name="wallet-outline" size={20} color={Colors.primary} />} /></View><View style={styles.metric}><Metric compact title="Consumo acumulado" value={`${consumoTotal.toLocaleString("pt-BR")} kWh`} icon={<Ionicons name="flash-outline" size={20} color={Colors.primary} />} /></View><View style={styles.metric}><Metric compact title="Faturas processadas" value={faturas.length} icon={<Ionicons name="receipt-outline" size={20} color={Colors.primary} />} /></View></View></Section>

    <Section title="Contas da concessionária"><View>{faturas.length ? faturas.map((item) => <TouchableOpacity key={`conta-${item.id}`} activeOpacity={0.84} onPress={() => abrirConta(item)}><Card style={styles.documentCard}><View style={styles.row}><View style={styles.icon}><Ionicons name="document-text-outline" size={22} color={Colors.primary} /></View><View style={styles.info}><Text style={styles.itemTitle}>{item.referencia || "Conta de luz"}</Text><Text style={styles.itemDetail}>{item.pdf_cemig_url ? "PDF disponível" : "PDF em preparação"}</Text></View><Ionicons name={item.pdf_cemig_url ? "download-outline" : "time-outline"} size={21} color={item.pdf_cemig_url ? Colors.primary : Colors.subtitle} /></View></Card></TouchableOpacity>) : <EmptyState icon="document-outline" title="0 contas da concessionária" subtitle="As contas desta UC aparecerão aqui quando forem importadas." />}</View></Section>

    <Section title="Faturas Andrade Energy"><View>{faturas.length ? faturas.map((item) => <TouchableOpacity key={`fatura-${item.id}`} activeOpacity={0.84} onPress={() => router.push(`/faturas/${item.id}`)}><Card style={styles.documentCard}><View style={styles.invoiceTop}><View><Text style={styles.invoiceValue}>{moeda(item.valor_total_unificado ?? item.valor_total)}</Text><Text style={styles.itemDetail}>{item.referencia || "Competência não informada"}</Text></View><Badge label={paga(item.status) ? "Paga" : "Em aberto"} variant={paga(item.status) ? "success" : "warning"} /></View><View style={styles.invoiceBottom}><Text style={styles.invoiceDate}>{paga(item.status) ? "Pagamento confirmado" : `Vencimento ${formatarDataBrasileira(item.vencimento, "não informado")}`}</Text><TouchableOpacity accessibilityLabel={`Excluir fatura ${item.referencia}`} onPress={(evento) => { evento.stopPropagation(); confirmarExclusao(item); }} style={styles.deleteInvoice}><Ionicons name="trash-outline" size={19} color={Colors.danger} /></TouchableOpacity><Ionicons name="chevron-forward" size={19} color={Colors.primary} /></View></Card></TouchableOpacity>) : <EmptyState icon="receipt-outline" title="0 faturas" subtitle="As faturas Andrade Energy desta UC aparecerão aqui após o faturamento." />}</View></Section>
  </ScrollView></Screen>;
}

function UnitMeta({ icon, label, value, last = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; last?: boolean }) {
  return <View style={[styles.metaRow, !last && styles.metaRowBorder]}><Ionicons name={icon} size={17} color={Colors.primary} /><View style={styles.metaCopy}><Text style={styles.metaLabel}>{label}</Text><Text numberOfLines={1} style={styles.metaValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  state: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  back: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 2, minHeight: 36, marginBottom: Spacing.sm },
  backLabel: { color: Colors.subtitle, fontSize: Typography.small, fontWeight: "700" },
  unitHero: { marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface, shadowOpacity: 0, elevation: 0 },
  unitHeroTop: { flexDirection: "row", alignItems: "center" },
  unitIcon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", marginRight: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  unitCopy: { flex: 1, minWidth: 0 },
  unitEyebrow: { color: Colors.subtitle, fontSize: 10, fontWeight: "900", letterSpacing: 0.9 },
  unitTitle: { marginTop: 2, color: Colors.text, fontSize: Typography.body, fontWeight: "900" },
  unitOwner: { marginTop: 2, color: Colors.subtitle, fontSize: Typography.small },
  heroDivider: { height: 1, marginVertical: Spacing.sm, backgroundColor: Colors.border },
  metaRow: { flexDirection: "row", alignItems: "center", minHeight: 43 },
  metaRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  metaCopy: { flex: 1, minWidth: 0, marginLeft: Spacing.sm },
  metaLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  metaValue: { marginTop: 1, color: Colors.text, fontSize: Typography.small, fontWeight: "700" },
  actions: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  action: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md, backgroundColor: Colors.surface },
  actionWide: { flex: undefined, width: "100%" },
  actionText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "900" },
  automaticInvoice: { minHeight: 66, flexDirection: "row", alignItems: "center", marginTop: -Spacing.sm, marginBottom: Spacing.lg, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  automaticInvoiceCopy: { flex: 1, marginHorizontal: Spacing.sm },
  automaticInvoiceTitle: { color: Colors.primaryDark, fontSize: Typography.small, fontWeight: "900" },
  automaticInvoiceSubtitle: { marginTop: 2, color: Colors.subtitle, fontSize: 11, lineHeight: 16 },
  deleteUnit: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: -Spacing.sm, marginBottom: Spacing.lg, borderWidth: 1, borderColor: "#FECACA", borderRadius: Radius.md, backgroundColor: "#FFF7F7" },
  deleteUnitText: { color: Colors.danger, fontSize: Typography.small, fontWeight: "900" },
  metrics: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metric: { width: "48%", marginBottom: Spacing.sm },
  documentCard: { marginBottom: Spacing.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface, shadowOpacity: 0, elevation: 0 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  info: { flex: 1, marginHorizontal: Spacing.sm },
  itemTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
  itemDetail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small },
  invoiceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  invoiceValue: { color: Colors.text, fontSize: Typography.body, fontWeight: "900" },
  invoiceBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  invoiceDate: { flex: 1, color: Colors.subtitle, fontSize: Typography.small },
  deleteInvoice: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginRight: Spacing.xs, borderRadius: Radius.round, backgroundColor: "#FEE2E2" },
});
