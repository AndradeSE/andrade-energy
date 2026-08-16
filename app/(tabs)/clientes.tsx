import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppHeader, Badge, Card, EmptyState, Loading, Screen } from "../../components/ui";
import CadastroActions from "../../components/cadastro/CadastroActions";
import { excluirCliente, listarClientes } from "../../services/clientes.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

function formatarDocumento(valor?: string) {
  const numeros = String(valor ?? "").replace(/\D/g, "");
  if (numeros.length === 11) return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (numeros.length === 14) return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return valor ?? "";
}

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]); const [busca, setBusca] = useState(""); const [loading, setLoading] = useState(true);
  const carregar = useCallback(async () => { try { setClientes((await listarClientes()) ?? []); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));
  const lista = useMemo(() => clientes.filter((c) => `${c.nome} ${c.uc} ${c.telefone}`.toLowerCase().includes(busca.toLowerCase())), [busca, clientes]);

  function confirmarExclusao(item: any) {
    Alert.alert("Excluir cliente", `Deseja excluir ${item.nome}? Esta ação não pode ser desfeita.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: async () => {
        try {
          await excluirCliente(item.id);
          setClientes((atuais) => atuais.filter((cliente) => cliente.id !== item.id));
        } catch (erro: any) {
          Alert.alert("Não foi possível excluir", erro?.response?.data?.message ?? erro?.message);
        }
      } },
    ]);
  }

  return <Screen>
    <AppHeader title="Clientes" subtitle="Gestão da carteira" contextTitle={`${clientes.length} clientes cadastrados`} contextSubtitle="Cadastre manualmente ou pela fatura" icon="people-outline" />
    {loading ? <Loading /> : <FlatList contentContainerStyle={styles.content} data={lista} keyExtractor={(item, index) => item?.id ? String(item.id) : `cliente-${index}`} showsVerticalScrollIndicator={false}
      ListHeaderComponent={<View><View style={styles.heading}><Text style={styles.title}>Sua carteira</Text><Text style={styles.subtitle}>Consulte clientes, contatos e unidades vinculadas.</Text></View><View style={styles.search}><Ionicons name="search-outline" size={20} color={Colors.subtitle} /><TextInput value={busca} onChangeText={setBusca} placeholder="Buscar por nome, UC ou telefone" placeholderTextColor={Colors.subtitle} style={styles.input} /></View><Text style={styles.addTitle}>Adicionar consumidor</Text><CadastroActions tipo="CLIENTE" /><TouchableOpacity onPress={() => router.push("/clientes/convidar")} style={styles.invite}><Ionicons name="mail-unread-outline" size={20} color="#FFF" /><Text style={styles.inviteText}>Convidar consumidor</Text></TouchableOpacity></View>}
      renderItem={({ item }) => <Pressable onPress={() => router.push(`/clientes/${item.id}`)}><Card style={styles.clientCard}><View style={styles.row}><View style={styles.avatar}><Text style={styles.avatarText}>{item.nome?.charAt(0)?.toUpperCase() ?? "C"}</Text></View><View style={styles.info}><Text numberOfLines={2} style={styles.name}>{item.nome}</Text><View style={styles.documentInfo}><Ionicons name="person-outline" size={14} color={Colors.primary} /><Text style={styles.detail}>{item.cpf ? `CPF/CNPJ ${formatarDocumento(item.cpf)}` : "CPF não informado"}</Text></View></View><TouchableOpacity accessibilityLabel={`Excluir cliente ${item.nome}`} onPress={(event) => { event.stopPropagation(); confirmarExclusao(item); }} style={styles.delete}><Ionicons name="trash-outline" size={18} color={Colors.danger} /></TouchableOpacity></View><View style={styles.meta}><View style={styles.metaItem}><Ionicons name="business-outline" size={14} color={Colors.primary} /><Text style={styles.metaText}>{item.distribuidora ?? "Concessionária não informada"}</Text></View><View style={styles.metaItem}><Ionicons name="call-outline" size={14} color={Colors.primary} /><Text style={styles.metaText}>{item.telefone || "Contato não informado"}</Text></View></View><View style={styles.footer}><Badge label={item.status ?? "ATIVO"} variant={item.status === "INATIVO" ? "danger" : "success"} /><View style={styles.openLink}><Text style={styles.openText}>Ver cliente</Text><Ionicons name="chevron-forward" size={16} color={Colors.primary} /></View></View></Card></Pressable>}
      ListEmptyComponent={<EmptyState icon="people-outline" title="Nenhum cliente encontrado" subtitle={busca ? "Altere a busca e tente novamente." : "Cadastre manualmente ou importe uma fatura."} />}
    />}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, heading: { marginBottom: Spacing.md }, title: { color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, subtitle: { marginTop: Spacing.xs, color: Colors.subtitle, lineHeight: 20 },
  search: { minHeight: 54, flexDirection: "row", alignItems: "center", marginBottom: Spacing.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface }, input: { flex: 1, marginLeft: Spacing.sm, color: Colors.text },
  clientCard: { padding: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.lg }, row: { flexDirection: "row", alignItems: "flex-start" }, avatar: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: Colors.primaryLight }, avatarText: { color: Colors.primaryDark, fontSize: Typography.body, fontWeight: "800" }, info: { flex: 1, minWidth: 0, marginHorizontal: Spacing.sm }, name: { color: Colors.text, fontSize: Typography.body, lineHeight: 20, fontWeight: "700" }, documentInfo: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }, detail: { flexShrink: 1, color: Colors.subtitle, fontSize: Typography.small },
  meta: { gap: 4, marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, metaItem: { minHeight: 20, flexDirection: "row", alignItems: "center", gap: Spacing.xs }, metaText: { flex: 1, color: Colors.subtitle, fontSize: Typography.small }, footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.sm }, openLink: { flexDirection: "row", alignItems: "center", gap: 3 }, openText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" },
  addTitle: { marginBottom: Spacing.sm, color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, invite: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginBottom: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.primary }, inviteText: { color: "#FFF", fontWeight: "800" }, delete: { width: 34, height: 34, alignItems: "center", justifyContent: "center", marginLeft: Spacing.xs, borderRadius: Radius.round, backgroundColor: "#FEE2E2" },
});
