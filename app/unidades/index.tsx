import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import CadastroActions from "../../components/cadastro/CadastroActions";
import { AppHeader, Card, ElasticFlatList as FlatList, EmptyState, Loading, Screen } from "../../components/ui";
import { listarUnidadesGestor } from "../../services/clientes.service";
import { Colors, Spacing, Typography } from "../../theme";

export default function Unidades() {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      setErro("");
      setUnidades((await listarUnidadesGestor()) ?? []);
    } catch (error: any) {
      setErro(error?.response?.data?.message ?? "Não foi possível carregar as unidades agora.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));
  async function atualizarPagina() {
    setAtualizando(true);
    try { await carregar(); } finally { setAtualizando(false); }
  }
  const lista = useMemo(() => { const termo = busca.trim().toLocaleLowerCase("pt-BR"); return unidades.filter((item) => `${item.numero} ${item.titular} ${item.endereco} ${item.clientes?.nome} ${item.clientes?.cpf}`.toLocaleLowerCase("pt-BR").includes(termo)); }, [busca, unidades]);

  return (
    <Screen>
      <AppHeader title="Unidades consumidoras" subtitle="Carteira dos clientes" contextTitle={`${unidades.length} unidades cadastradas`} contextSubtitle="Todas as unidades vinculadas aos clientes" icon="flash-outline" />
      {loading ? <Loading /> : <FlatList
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}
        contentContainerStyle={styles.content}
        data={lista}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<View><Text style={styles.title}>Unidades consumidoras</Text><Text style={styles.subtitle}>Consulte as unidades de todos os clientes.</Text><View style={styles.search}><TextInput value={busca} onChangeText={setBusca} placeholder="Buscar por UC, cliente, CPF ou endereço" placeholderTextColor={Colors.subtitle} style={styles.searchInput} /></View><CadastroActions tipo="UNIDADE" /></View>}
        renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/unidades/[id]", params: { id: item.id, numero: item.numero, clienteId: item.cliente_id ?? item.clientes?.id ?? "", cliente: item.clientes?.nome ?? "", usinaId: item.usina_id ?? item.usinas?.id ?? "", usinaNome: item.usinas?.nome ?? item.usina_nome ?? "", titular: item.titular ?? "", distribuidora: item.distribuidora ?? "" } })}><Card style={styles.unitCard}>
          <View style={styles.row}><Text style={styles.number}>UC {item.numero}</Text><Text style={styles.badge}>{item.tipo}</Text></View>
          <Text style={styles.owner}>{item.clientes?.nome ?? item.titular ?? "Cliente não identificado"}</Text>
          <Text style={styles.detail}>{item.usinas?.nome ?? item.usina_nome ?? (item.usina_id ? "Usina vinculada" : "Ainda não alocada")}</Text>
          <Text style={styles.detail}>{item.modalidade_faturamento === "INJECAO" ? "Faturamento por injeção" : "Faturamento por compensação"} · {item.desconto_percentual}%</Text>
        </Card></Pressable>}
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
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  number: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, badge: { color: Colors.primaryDark, fontSize: 10, fontWeight: "700" },
  owner: { marginTop: 5, color: Colors.text, fontSize: Typography.small, fontWeight: "600" }, detail: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
});
