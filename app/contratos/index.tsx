import { matchesContractUnit } from "../../services/assistant-contract-unit";
import { normalizeCapabilityText } from "../../services/assistant-capabilities";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Pressable } from "../../components/assistant/AssistantNativeControls";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader, Badge, Card, ElasticFlatList as FlatList, EmptyState, Screen } from "../../components/ui";
import { cancelarMinutaSemAceite, excluirContrato, listarContratosDaEmpresa } from "../../services/contratos.service";
import { abrirDocumentoContrato } from "../../services/contrato-documento.service";
import { useAuth } from "../../contexts/AuthContext";
import { initialTabKey } from "../../services/navigation-preload.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

function statusContrato(contrato: any) {
  const status = String(contrato.status ?? "").toUpperCase();
  const documento = contrato.dados_documento ?? {};
  if (["CANCELADO", "ENCERRADO"].includes(status)) return status === "CANCELADO" ? "Cancelado" : "Encerrado";
  if (["ATIVO", "VIGENTE"].includes(status) && contrato.cancelamento_pendente) return "Cancelamento solicitado";
  if (contrato.renovacao_solicitada?.status === "PENDENTE") return "Renovação solicitada";
  if (documento.assinatura_externa_pendente === true) return "Aguardando conferência";
  if (!contrato.aceite_cliente_em && documento.aceite_cliente_exigido === true) return "Aguardando aceite";
  if (status === "RASCUNHO" && documento.envio_email_concluido === true) return "Aguardando assinatura";
  if (status === "SUBSTITUIDO") return "Versão anterior";
  if (status === "VIGENTE") return "Vigente";
  if (status === "ATIVO") return "Em andamento";
  return contrato.status ?? "Rascunho";
}

function separarDestaques(contratos: any[]) {
  const porUc = new Map<string, any[]>();
  for (const contrato of contratos) {
    const uc = String(contrato.unidade_consumidora_id ?? contrato.unidades_consumidoras?.numero ?? contrato.id);
    porUc.set(uc, [...(porUc.get(uc) ?? []), contrato]);
  }
  const destaques: any[] = [];
  const historico: any[] = [];
  for (const versoes of porUc.values()) {
    const ordenadas = [...versoes].sort((a, b) => Date.parse(b.updated_at ?? b.created_at ?? "") - Date.parse(a.updated_at ?? a.created_at ?? ""));
    const pendente = ordenadas.find((contrato) => ["Cancelamento solicitado", "Renovação solicitada", "Aguardando conferência", "Aguardando aceite", "Aguardando assinatura"].includes(statusContrato(contrato)));
    const vigente = ordenadas.find((contrato) => String(contrato.status ?? "").toUpperCase() === "VIGENTE");
    const idsDestaque = new Set([pendente?.id, vigente?.id].filter(Boolean));
    const atual = ordenadas.find((contrato) => ["ATIVO", "RASCUNHO"].includes(String(contrato.status ?? "").toUpperCase()));
    if (!idsDestaque.size && atual) idsDestaque.add(atual.id);
    for (const contrato of ordenadas) (idsDestaque.has(contrato.id) ? destaques : historico).push(contrato);
  }
  return { destaques, historico };
}

export default function ContratosClientes() {
  const { user, usinaSelecionada } = useAuth();
  const queryClient = useQueryClient();
  const inicial = queryClient.getQueryData<any[]>(initialTabKey(String(user?.id ?? ""), usinaSelecionada?.id ?? user?.usina_id, "contratos"));
  const [contratos, setContratos] = useState<any[]>(() => (inicial ?? []).map((contrato) => ({ ...contrato, unidades_consumidoras: Array.isArray(contrato.unidades_consumidoras) ? contrato.unidades_consumidoras[0] : contrato.unidades_consumidoras })));
  const [carregando, setCarregando] = useState(!inicial);
  const [atualizando, setAtualizando] = useState(false);
  const [clienteAberto, setClienteAberto] = useState<string | null>(null);
  const [historicoAberto, setHistoricoAberto] = useState<string | null>(null);
  const [abrindoDocumento, setAbrindoDocumento] = useState(false);

  async function lerContrato(id: string) {
    if (abrindoDocumento) return;
    setAbrindoDocumento(true);
    try { await abrirDocumentoContrato(id); }
    catch (erro: any) { Alert.alert("Não foi possível abrir o contrato", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente."); }
    finally { setAbrindoDocumento(false); }
  }

  const carregar = useCallback(async () => {
    try {
      const data = await listarContratosDaEmpresa(usinaSelecionada?.id);
      setContratos((data ?? []).filter((contrato: any) => !usinaSelecionada?.id || contrato.usina_id === usinaSelecionada.id).map((contrato) => ({
        ...contrato,
        unidades_consumidoras: Array.isArray(contrato.unidades_consumidoras)
          ? contrato.unidades_consumidoras[0]
          : contrato.unidades_consumidoras,
      })));
    } catch (erro: any) {
      Alert.alert("Não foi possível carregar os contratos", erro?.message || "Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [usinaSelecionada?.id]);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await carregar();
    } finally {
      setAtualizando(false);
    }
  }

  function confirmarCancelamentoMinuta(contrato: any) {
    Alert.alert("Cancelar minuta sem aceite?", "O documento enviado deixará de aceitar assinatura. Não haverá multa nem cobrança de encerramento. Depois, você poderá excluir o cliente se não houver outros contratos pendentes ou ativos.", [
      { text: "Manter minuta", style: "cancel" },
      { text: "Cancelar minuta", style: "destructive", onPress: async () => {
        try { await cancelarMinutaSemAceite(contrato.id); await carregar(); }
        catch (erro: any) { Alert.alert("Não foi possível cancelar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente."); }
      } },
    ]);
  }

  function confirmarExclusao(contrato: any) {
    Alert.alert("Excluir rascunho?", "Esta ação remove somente esta versão não enviada. Contratos assinados permanecem intactos.", [
      { text: "Manter", style: "cancel" },
      { text: "Excluir rascunho", style: "destructive", onPress: async () => {
        try {
          await excluirContrato(contrato.id);
          await carregar();
        } catch (erro: any) {
          Alert.alert("Não foi possível excluir", erro?.message || "Tente novamente.");
        }
      } },
    ]);
  }

  const { solarCliente, solarUcFinal, solarAbrirPdf } = useLocalSearchParams<{ solarCliente?: string; solarUcFinal?: string; solarAbrirPdf?: string }>();
  const finalUc = typeof solarUcFinal === "string" && /^\d{1,32}$/.test(solarUcFinal) ? solarUcFinal : "";
  const daUc = finalUc ? contratos.filter(c => matchesContractUnit(c, finalUc)) : contratos;
  const ucsEncontradas = new Set(daUc.map(c => String(c.unidade_consumidora_id ?? c.unidades_consumidoras?.numero ?? c.id)));
  const porCliente = daUc.reduce((mapa, contrato) => {
    const chave = String(contrato.cliente_id ?? contrato.clientes?.nome ?? contrato.id);
    const grupo = mapa.get(chave) ?? {
      id: chave,
      nome: contrato.clientes?.nome ?? contrato.unidades_consumidoras?.titular ?? "Cliente",
      contratos: [] as any[],
    };
    grupo.contratos.push(contrato);
    mapa.set(chave, grupo);
    return mapa;
  }, new Map<string, { id: string; nome: string; contratos: any[] }>());

  const buscaCliente = typeof solarCliente === "string" ? normalizeCapabilityText(solarCliente).trim() : "";
  const todosGrupos = Array.from(porCliente.values() as Iterable<{ id: string; nome: string; contratos: any[] }>).map((grupo) => ({ ...grupo, ...separarDestaques(grupo.contratos) }));

  const encontrados = buscaCliente ? todosGrupos.filter(grupo => normalizeCapabilityText(grupo.nome).includes(buscaCliente)) : todosGrupos;
  const filtroSemResultado = Boolean(buscaCliente && !encontrados.length && todosGrupos.length);
  const grupos = filtroSemResultado ? todosGrupos : encontrados;
  const aberto = clienteAberto === null && (buscaCliente || finalUc) && grupos.length === 1 ? grupos[0].id : clienteAberto;
  const candidatosPdf = solarAbrirPdf === "1" && (buscaCliente || (finalUc && ucsEncontradas.size === 1)) && !filtroSemResultado && grupos.length === 1
    ? grupos[0].contratos
    : [];
  const vigentesPdf = candidatosPdf.filter(c => ["VIGENTE", "ATIVO"].includes(String(c.status).toUpperCase()));
  const escolhidoPdf = vigentesPdf.length === 1 ? vigentesPdf[0] : candidatosPdf.length === 1 ? candidatosPdf[0] : undefined;
  const idSolicitado = escolhidoPdf ? String(escolhidoPdf.id) : undefined;
  const abertoPelaSolar = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!idSolicitado || carregando || atualizando || abertoPelaSolar.current === idSolicitado) return;
    abertoPelaSolar.current = idSolicitado;
    void lerContrato(idSolicitado);
  }, [idSolicitado, carregando, atualizando]);
  function linhaContrato(contrato: any) {
    return <View key={contrato.id} style={styles.contractRow}>
      <View style={styles.contractStatus}><Badge label={statusContrato(contrato)} variant={String(contrato.status).toUpperCase() === "VIGENTE" && !contrato.cancelamento_pendente ? "success" : "warning"} /></View>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir PDF do contrato ${contrato.numero ?? "sem número"}`} disabled={abrindoDocumento} onPress={() => { void lerContrato(contrato.id); }} style={[styles.row, { flex: 1 }]}>
        <View style={styles.icon}><Ionicons name="document-text-outline" size={20} color={Colors.primary} /></View>
        <View style={styles.info}>
          <Text style={styles.contractNumber}>{contrato.numero ?? "Contrato sem número"}</Text>
          <Text style={styles.detail}>{contrato.unidades_consumidoras?.numero ? `UC ${contrato.unidades_consumidoras.numero}` : "UC não vinculada"}{contrato.versao ? ` · Versão ${contrato.versao}` : ""}</Text>
        </View>
        <Ionicons name="open-outline" size={19} color={Colors.primary} />
        </Pressable>
        {String(contrato.status).toUpperCase() === "RASCUNHO" && !contrato.aceite_cliente_em && !contrato.contrato_assinado_url && contrato.dados_documento?.envio_email_concluido !== true && <Pressable accessibilityRole="button" accessibilityLabel={`Excluir rascunho ${contrato.numero ?? "sem número"}`} onPress={() => confirmarExclusao(contrato)} style={styles.deleteButton}><Ionicons name="trash-outline" size={18} color={Colors.danger} /></Pressable>}
      </View>
      {String(contrato.status).toUpperCase() === "RASCUNHO" && !contrato.aceite_cliente_em && !contrato.contrato_assinado_url && !contrato.assinado_em && !contrato.assinatura_cliente_hash && contrato.dados_documento?.assinatura_externa_pendente !== true && !String(user?.papel_empresa ?? "").startsWith("COLABORADOR_") ? <Pressable accessibilityRole="button" onPress={() => confirmarCancelamentoMinuta(contrato)} style={styles.cancelReviewButton}><Ionicons name="close-circle-outline" size={18} color={Colors.danger} /><Text style={styles.cancelReviewText}>Cancelar minuta sem aceite</Text></Pressable> : null}
      {(["ATIVO", "VIGENTE"].includes(String(contrato.status ?? "").toUpperCase()) && contrato.cancelamento_pendente) ? <Pressable accessibilityRole="button" accessibilityLabel={`Analisar cancelamento do contrato ${contrato.numero ?? ""}`} onPress={() => router.push(`/contratos/${contrato.id}` as any)} style={styles.cancelReviewButton}><Ionicons name="alert-circle-outline" size={18} color={Colors.danger} /><Text style={styles.cancelReviewText}>Analisar cancelamento</Text><Ionicons name="chevron-forward" size={17} color={Colors.danger} /></Pressable> : null}
      {contrato.renovacao_solicitada?.status === "PENDENTE" && contrato.unidade_consumidora_id ? <Pressable accessibilityRole="button" accessibilityLabel={`Preparar renovação do contrato ${contrato.numero ?? ""}`} onPress={() => router.push({ pathname: "/unidades/contrato", params: { id: contrato.unidade_consumidora_id, numero: contrato.unidades_consumidoras?.numero ?? "", clienteId: contrato.cliente_id, revisao: "1", renovacao: "1" } })} style={styles.renewReviewButton}><Ionicons name="refresh-outline" size={18} color={Colors.primary} /><Text style={styles.renewReviewText}>Preparar renovação</Text><Ionicons name="chevron-forward" size={17} color={Colors.primary} /></Pressable> : null}
    </View>;
  }

  return <Screen><AppHeader title="Contratos" subtitle="Documentos da carteira" contextTitle={`${contratos.length} contratos vinculados`} contextSubtitle={`${grupos.length} clientes com contratos`} icon="document-text-outline" /><FlatList contentContainerStyle={styles.content} data={grupos} keyExtractor={(item) => item.id}
    refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}
    ListHeaderComponent={<Card style={styles.heading}><Text style={styles.title}>Contratos por cliente</Text><Text style={styles.subtitle}>Em destaque: contrato vigente e documentos que aguardam ação. As demais versões ficam no histórico.</Text>{buscaCliente && !filtroSemResultado && !idSolicitado && !carregando && grupos.length > 0 ? <Text style={styles.subtitle}>{candidatosPdf.length ? "Há mais de um PDF. Escolha o contrato abaixo." : grupos.length > 1 ? "Escolha o cliente abaixo." : "Este cliente ainda não tem PDF disponível."}</Text> : null}{finalUc && ucsEncontradas.size > 1 ? <Text style={styles.subtitle}>Mais de uma UC termina assim. Informe mais dígitos ou escolha na lista.</Text> : null}{filtroSemResultado ? <Text style={styles.subtitle}>Não encontrei o nome solicitado. Escolha o cliente na lista abaixo.</Text> : null}</Card>}
    renderItem={({ item }) => <Card style={styles.groupCard}><Pressable accessibilityRole="button" accessibilityLabel={`${item.nome}, ${item.destaques.length} contratos em destaque`} accessibilityState={{ expanded: aberto === item.id }} onPress={() => setClienteAberto(aberto === item.id ? "" : item.id)} style={styles.groupHeader}><Ionicons name="person-outline" size={20} color={Colors.primary} /><View style={styles.groupTitle}><Text style={styles.client}>{item.nome}</Text><Text style={styles.detail}>{item.destaques.length} em destaque{item.historico.length ? ` · ${item.historico.length} no histórico` : ""}</Text></View><Ionicons name={aberto === item.id ? "chevron-up" : "chevron-down"} size={20} color={Colors.primary} /></Pressable>{aberto === item.id && <>{item.destaques.map(linhaContrato)}{item.historico.length > 0 && <><Pressable accessibilityRole="button" accessibilityState={{ expanded: historicoAberto === item.id }} onPress={() => setHistoricoAberto((atual) => atual === item.id ? null : item.id)} style={styles.historyButton}><Text style={styles.historyText}>{historicoAberto === item.id ? "Ocultar histórico" : `Ver histórico (${item.historico.length})`}</Text><Ionicons name={historicoAberto === item.id ? "chevron-up" : "chevron-down"} size={18} color={Colors.primary} /></Pressable>{historicoAberto === item.id && item.historico.map(linhaContrato)}</>}</>}</Card>}
    ListEmptyComponent={!carregando ? <EmptyState icon="document-text-outline" title={finalUc ? "Nenhum contrato para esse final de UC" : "Nenhum contrato vinculado"} subtitle="Os contratos cadastrados para os clientes aparecerão aqui." /> : null}
  /></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, heading: { marginBottom: Spacing.lg },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, color: Colors.subtitle, lineHeight: 21 },
  groupCard: { marginBottom: Spacing.md }, groupHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm }, groupTitle: { flex: 1 },
  contractRow: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  contractStatus: { flexDirection: "row", justifyContent: "flex-end", marginBottom: Spacing.sm },
  row: { flexDirection: "row", alignItems: "center" }, icon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  info: { flex: 1, minWidth: 0, marginHorizontal: Spacing.sm }, client: { color: Colors.text, fontWeight: "800", fontSize: Typography.body }, contractNumber: { color: Colors.text, fontWeight: "700" }, detail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small },
  deleteButton: { padding: Spacing.sm, marginLeft: Spacing.xs },
  historyButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, padding: Spacing.md, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  historyText: { color: Colors.primary, fontWeight: "700" },
  cancelReviewButton: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: Spacing.sm, paddingVertical: Spacing.sm },
  cancelReviewText: { flex: 1, color: Colors.danger, fontWeight: "800" },
  renewReviewButton: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: Spacing.sm, paddingVertical: Spacing.sm },
  renewReviewText: { flex: 1, color: Colors.primary, fontWeight: "800" },
});
