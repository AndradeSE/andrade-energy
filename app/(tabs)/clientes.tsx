import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppHeader, Badge, Card, EmptyState, Loading, Screen } from "../../components/ui";
import { listarClientes } from "../../services/clientes.service";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]); const [busca, setBusca] = useState(""); const [loading, setLoading] = useState(true);
  const carregar = useCallback(async () => { try { setClientes((await listarClientes()) ?? []); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));
  const lista = useMemo(() => clientes.filter((c) => `${c.nome} ${c.uc} ${c.telefone}`.toLowerCase().includes(busca.toLowerCase())), [busca, clientes]);

  function confirmarExclusao(item: any) {
    Alert.alert("Excluir cliente", `Deseja excluir ${item.nome}? Esta ação não pode ser desfeita.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
        const { error } = await supabase.from("clientes").delete().eq("id", item.id);
        if (error) Alert.alert("Não foi possível excluir", error.message);
        else setClientes((atuais) => atuais.filter((cliente) => cliente.id !== item.id));
      } },
    ]);
  }

  return <Screen>
    <AppHeader title="Clientes" subtitle="Gestão da carteira" contextTitle={`${clientes.length} clientes cadastrados`} contextSubtitle="Cadastre manualmente ou pela fatura" icon="people-outline" />
    {loading ? <Loading /> : <FlatList contentContainerStyle={styles.content} data={lista} keyExtractor={(item, index) => item?.id ? String(item.id) : `cliente-${index}`} showsVerticalScrollIndicator={false}
      ListHeaderComponent={<View><View style={styles.heading}><Text style={styles.title}>Sua carteira</Text><Text style={styles.subtitle}>Consulte clientes, contatos e unidades vinculadas.</Text></View><View style={styles.search}><Ionicons name="search-outline" size={20} color={Colors.subtitle} /><TextInput value={busca} onChangeText={setBusca} placeholder="Buscar por nome, UC ou telefone" placeholderTextColor={Colors.subtitle} style={styles.input} /></View><TouchableOpacity onPress={() => router.push("/clientes/convidar")} style={styles.invite}><Ionicons name="mail-unread-outline" size={20} color="#FFF" /><Text style={styles.inviteText}>Convidar consumidor</Text></TouchableOpacity></View>}
      renderItem={({ item }) => <Pressable onPress={() => router.push(`/clientes/${item.id}`)}><Card><View style={styles.row}><View style={styles.avatar}><Text style={styles.avatarText}>{item.nome?.charAt(0)?.toUpperCase() ?? "C"}</Text></View><View style={styles.info}><Text style={styles.name}>{item.nome}</Text><Text style={styles.detail}>{item.uc ? `UC ${item.uc}` : "Sem unidade vinculada"}</Text></View><Badge label={item.status ?? "ATIVO"} variant={item.status === "INATIVO" ? "danger" : "success"} /><TouchableOpacity accessibilityLabel={`Excluir cliente ${item.nome}`} onPress={(event) => { event.stopPropagation(); confirmarExclusao(item); }} style={styles.delete}><Ionicons name="trash-outline" size={20} color={Colors.danger} /></TouchableOpacity></View><View style={styles.meta}><Text style={styles.metaText}>{item.distribuidora ?? "CEMIG"}</Text><Text style={styles.metaText}>{item.telefone || "Contato não informado"}</Text><Ionicons name="chevron-forward" size={18} color={Colors.subtitle} /></View></Card></Pressable>}
      ListEmptyComponent={<EmptyState icon="people-outline" title="Nenhum cliente encontrado" subtitle={busca ? "Altere a busca e tente novamente." : "Cadastre manualmente ou importe uma fatura."} />}
    />}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, heading: { marginBottom: Spacing.md }, title: { color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, subtitle: { marginTop: Spacing.xs, color: Colors.subtitle, lineHeight: 20 },
  search: { minHeight: 54, flexDirection: "row", alignItems: "center", marginBottom: Spacing.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface }, input: { flex: 1, marginLeft: Spacing.sm, color: Colors.text },
  row: { flexDirection: "row", alignItems: "center" }, avatar: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.primaryLight }, avatarText: { color: Colors.primaryDark, fontSize: Typography.card, fontWeight: "800" }, info: { flex: 1, marginHorizontal: Spacing.sm }, name: { color: Colors.text, fontSize: Typography.body, fontWeight: "700" }, detail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small },
  meta: { flexDirection: "row", alignItems: "center", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, metaText: { flex: 1, color: Colors.subtitle, fontSize: Typography.small },
  invite: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginBottom: Spacing.sm, borderRadius: Radius.lg, backgroundColor: Colors.primary }, inviteText: { color: "#FFF", fontWeight: "800" }, delete: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: Spacing.xs, borderRadius: Radius.round, backgroundColor: "#FEE2E2" },
});
