import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import CadastroActions from "../../components/cadastro/CadastroActions";
import { AppHeader, Card, EmptyState, Screen } from "../../components/ui";
import { supabase } from "../../supabase";
import { Colors, Spacing, Typography } from "../../theme";

export default function Unidades() {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    const { data } = await supabase.from("unidades_consumidoras")
      .select("*, clientes(id,nome,cpf), usinas(nome)").not("cliente_id", "is", null).order("created_at", { ascending: false });
    setUnidades(data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));
  const lista = useMemo(() => { const termo = busca.trim().toLocaleLowerCase("pt-BR"); return unidades.filter((item) => `${item.numero} ${item.titular} ${item.endereco} ${item.clientes?.nome} ${item.clientes?.cpf}`.toLocaleLowerCase("pt-BR").includes(termo)); }, [busca, unidades]);

  return (
    <Screen><AppHeader title="Unidades consumidoras" subtitle="Carteira dos clientes" contextTitle={`${unidades.length} unidades cadastradas`} contextSubtitle="Todas as unidades vinculadas aos clientes" icon="flash-outline" /><FlatList
      contentContainerStyle={styles.content}
      data={lista}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<View><Text style={styles.title}>Unidades consumidoras</Text><Text style={styles.subtitle}>Consulte as unidades de todos os clientes.</Text><View style={styles.search}><TextInput value={busca} onChangeText={setBusca} placeholder="Buscar por UC, cliente, CPF ou endereço" placeholderTextColor={Colors.subtitle} style={styles.searchInput} /></View><CadastroActions tipo="UNIDADE" /></View>}
      renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/unidades/[id]", params: { id: item.id } })}><Card>
        <View style={styles.row}><Text style={styles.number}>UC {item.numero}</Text><Text style={styles.badge}>{item.tipo}</Text></View>
        <Text style={styles.owner}>{item.clientes?.nome ?? item.titular ?? "Cliente não identificado"}</Text>
        <Text style={styles.detail}>{item.modalidade_faturamento === "INJECAO" ? "Faturamento por injeção" : "Faturamento por compensação"} · {item.desconto_percentual}%</Text>
      </Card></Pressable>}
      ListEmptyComponent={<View><EmptyState title={busca ? "Nenhuma unidade encontrada" : "Nenhuma unidade cadastrada"} subtitle={busca ? "Altere os termos da busca." : "Use uma fatura da concessionária ou faça o cadastro manual."} /></View>}
    /></Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "700" },
  subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
  search: { minHeight: 52, justifyContent: "center", marginBottom: Spacing.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, backgroundColor: Colors.surface }, searchInput: { color: Colors.text },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  number: { color: Colors.text, fontSize: Typography.card, fontWeight: "700" }, badge: { color: Colors.primaryDark, fontSize: Typography.small, fontWeight: "700" },
  owner: { marginTop: Spacing.sm, color: Colors.text, fontWeight: "600" }, detail: { marginTop: Spacing.xs, color: Colors.subtitle },
});
