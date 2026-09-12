import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import CadastroActions from "../../components/cadastro/CadastroActions";
import { AppHeader, Card, ElasticFlatList as FlatList, EmptyState, Loading, Screen } from "../../components/ui";
import { listarUnidadesGestor, listarUnidadesCliente } from "../../services/clientes.service";
import { Colors, Spacing, Typography } from "../../theme";

function acaoContratualDaUc(unidade: any) {
  const contrato = unidade?.contrato_resumo;
  const assinado = Boolean(contrato?.aceite_cliente_em || contrato?.contrato_assinado_url || String(contrato?.status ?? "").toUpperCase() === "VIGENTE");
  if (assinado) return { label: "Ver contrato", status: "Assinado", revisao: false, liberada: true };
  if (contrato?.revisao_configuracao_pendente) return { label: "Gerar nova versão", status: "Nova versão necessária", revisao: true, liberada: false };
  if (unidade?.convite_resumo) return { label: "Reenviar convite", status: "Aguardando assinatura", revisao: false, liberada: false };
  return { label: "Configurar contrato e gerar minuta", status: "Minuta ainda não gerada", revisao: false, liberada: false };
}

export default function Unidades() {
  const params = useLocalSearchParams<{ clienteId?: string; cliente?: string }>();
  const clienteId = String(params.clienteId || "");
  const [unidades, setUnidades] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setErro("");
      setUnidades((await (clienteId ? listarUnidadesCliente(clienteId) : listarUnidadesGestor())) ?? []);
    } catch (error: any) {
      setErro(error?.response?.data?.message ?? "Não foi possível carregar as unidades agora.");
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));
  async function atualizarPagina() {
    setAtualizando(true);
    try { await carregar(); } finally { setAtualizando(false); }
  }
  const lista = useMemo(() => { const termo = busca.trim().toLocaleLowerCase("pt-BR"); return unidades.filter((item) => `${item.apelido} ${item.numero} ${item.titular} ${item.endereco} ${item.clientes?.nome} ${item.clientes?.cpf}`.toLocaleLowerCase("pt-BR").includes(termo)); }, [busca, unidades]);

  function abrirContratoDaUnidade(item: any) {
    const acao = acaoContratualDaUc(item);
    router.push({
      pathname: "/unidades/contrato",
      params: {
        id: item.id,
        numero: item.numero,
        clienteId: item.cliente_id ?? item.clientes?.id ?? clienteId,
        cliente: item.clientes?.nome ?? params.cliente ?? "",
        revisao: acao.revisao ? "1" : undefined,
      },
    });
  }

  return (
    <Screen>
      <AppHeader title="Unidades consumidoras" subtitle={clienteId ? params.cliente || "Unidades do cliente" : "Carteira dos clientes"} contextTitle={`${unidades.length} unidades cadastradas`} contextSubtitle={clienteId ? "Unidades vinculadas a este cliente" : "Todas as unidades vinculadas aos clientes"} icon="flash-outline" />
      {loading ? <Loading /> : <FlatList
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}
        contentContainerStyle={styles.content}
        data={lista}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<View><Text style={styles.title}>Unidades consumidoras</Text><Text style={styles.subtitle}>{clienteId ? "Consulte e adicione unidades deste cliente." : "Consulte as unidades de todos os clientes."}</Text><View style={styles.search}><TextInput value={busca} onChangeText={setBusca} placeholder="Buscar por UC, cliente, CPF ou endereço" placeholderTextColor={Colors.subtitle} style={styles.searchInput} /></View><CadastroActions tipo="UNIDADE" clienteId={clienteId} /></View>}
        renderItem={({ item }) => { const acaoContrato = acaoContratualDaUc(item); return <Pressable onPress={() => router.push({ pathname: "/unidades/[id]", params: { id: item.id, numero: item.numero, clienteId: item.cliente_id ?? item.clientes?.id ?? "", cliente: item.clientes?.nome ?? "", usinaId: item.usina_id ?? item.usinas?.id ?? "", usinaNome: item.usinas?.nome ?? item.usina_nome ?? "", titular: item.titular ?? "", distribuidora: item.distribuidora ?? "" } })}><Card style={styles.unitCard}>
          <View style={styles.row}><View style={styles.identification}><Text numberOfLines={1} style={styles.number}>{String(item.apelido ?? "").trim() || `UC ${item.numero}`}</Text>{item.apelido ? <Text style={styles.ucNumber}>UC {item.numero}</Text> : null}</View><Text style={styles.badge}>{item.tipo}</Text></View>
          <Text style={styles.owner}>Titular da fatura: {item.titular_fatura ?? "Não identificado na fatura anexada"}</Text>
          <Text style={styles.detail}>{item.usinas?.nome ?? item.usina_nome ?? (item.usina_id ? "Usina vinculada" : "Ainda não alocada")}</Text>
          <Text style={styles.detail}>{item.modalidade_faturamento === "INJECAO" ? "Faturamento por injeção" : "Faturamento por compensação"} · {item.desconto_percentual}%</Text>
          <View style={[styles.contractStatus, acaoContrato.liberada && styles.contractStatusSigned]}><Text style={[styles.contractStatusText, acaoContrato.liberada && styles.contractStatusTextSigned]}>{acaoContrato.status}</Text></View>
          <TouchableOpacity
            accessibilityLabel={`Abrir contrato e convite da UC ${item.numero}`}
            onPress={(evento) => {
              evento.stopPropagation();
              abrirContratoDaUnidade(item);
            }}
            style={styles.invite}
          >
            <Text style={styles.inviteText}>{acaoContrato.label}</Text>
          </TouchableOpacity>
          <Text style={styles.accessHint}>{acaoContrato.liberada ? "Contrato assinado. Esta UC já está disponível ao cliente." : "Próximos passos: configure o contrato, gere e revise a minuta e só depois envie para assinatura."}</Text>
        </Card></Pressable>; }}
        ListEmptyComponent={<View><EmptyState title={erro ? "Não foi possível carregar as unidades" : busca ? "Nenhuma unidade encontrada" : "Nenhuma unidade cadastrada"} subtitle={erro || (busca ? "Altere os termos da busca." : "Use uma fatura da concessionária ou faça o cadastro manual.")} /></View>}
      />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  unitCard: { padding: Spacing.md, marginBottom: Spacing.sm, borderRadius: 14 },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "700" },
  subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
  search: { minHeight: 52, justifyContent: "center", marginBottom: Spacing.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, backgroundColor: Colors.surface }, searchInput: { color: Colors.text },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: Spacing.sm },
  identification: { flex: 1 },
  number: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, badge: { color: Colors.primaryDark, fontSize: 10, fontWeight: "700" },
  ucNumber: { marginTop: 2, color: Colors.subtitle, fontSize: Typography.small, fontWeight: "600" },
  owner: { marginTop: 5, color: Colors.text, fontSize: Typography.small, fontWeight: "700" }, client: { marginTop: 2, color: Colors.subtitle, fontSize: 11 }, detail: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
  invite: { minHeight: 40, alignItems: "center", justifyContent: "center", marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  inviteText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" },
  accessHint: { marginTop: 2, color: Colors.subtitle, fontSize: 10, lineHeight: 14, textAlign: "center" },
  contractStatus: { alignSelf: "flex-start", marginTop: Spacing.sm, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#FEF3C7" },
  contractStatusSigned: { backgroundColor: "#DCFCE7" },
  contractStatusText: { color: "#92400E", fontSize: 10, fontWeight: "800" },
  contractStatusTextSigned: { color: "#166534" },
});
