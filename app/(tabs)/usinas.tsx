import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import CadastroActions from "../../components/cadastro/CadastroActions";
import { AppHeader, Badge, Card, EmptyState, Loading, Screen } from "../../components/ui";
import { listarUsinas } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function Usinas() {
  const [usinas, setUsinas] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  const carregar = useCallback(async () => { try { setUsinas((await listarUsinas()) ?? []); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return <Screen><AppHeader title="Usinas" subtitle="Ativos de geração" contextTitle={`${usinas.length} usinas cadastradas`} contextSubtitle="Produção, unidades e operação" icon="business-outline" />
    {loading ? <Loading /> : <FlatList contentContainerStyle={styles.content} data={usinas} keyExtractor={(item) => item.id}
      ListHeaderComponent={<View><Text style={styles.title}>Parque gerador</Text><Text style={styles.subtitle}>Acompanhe e mantenha os dados de cada usina.</Text><CadastroActions tipo="USINA" /></View>}
      renderItem={({ item }) => <Pressable onPress={() => router.push(`/usinas/${item.id}`)}><Card><View style={styles.row}><View style={styles.icon}><Ionicons name="sunny-outline" size={25} color={Colors.primary} /></View><View style={styles.info}><Text style={styles.name}>{item.nome}</Text><Text style={styles.detail}>{item.numero_instalacao ? `Instalação ${item.numero_instalacao}` : item.distribuidora ?? "CEMIG"}</Text></View><Badge label={item.status ?? "ATIVA"} variant={item.status === "INATIVA" ? "danger" : "success"} /></View><View style={styles.metrics}><View><Text style={styles.metricLabel}>POTÊNCIA</Text><Text style={styles.metricValue}>{Number(item.potencia_kwp ?? 0).toLocaleString("pt-BR")} kWp</Text></View><View style={styles.open}><Text style={styles.openText}>Ver detalhes</Text><Ionicons name="arrow-forward" size={17} color={Colors.primary} /></View></View></Card></Pressable>}
      ListEmptyComponent={<EmptyState icon="sunny-outline" title="Nenhuma usina cadastrada" subtitle="Cadastre manualmente ou importe a fatura da unidade geradora." />}
    />}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 3 }, title: { color: Colors.text, fontSize: Typography.section, fontWeight: "800" }, subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center" }, icon: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight }, info: { flex: 1, marginHorizontal: Spacing.sm }, name: { color: Colors.text, fontSize: Typography.body, fontWeight: "700" }, detail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small },
  metrics: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, metricLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "700" }, metricValue: { marginTop: 3, color: Colors.text, fontWeight: "700" }, open: { flexDirection: "row", alignItems: "center" }, openText: { marginRight: 5, color: Colors.primary, fontSize: Typography.small, fontWeight: "700" },
});
