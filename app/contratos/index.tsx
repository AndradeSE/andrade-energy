import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader, Badge, Card, EmptyState, Screen } from "../../components/ui";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function ContratosClientes() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data } = await supabase.from("contratos").select("*, clientes(nome, uc)").order("created_at", { ascending: false });
    setContratos(data ?? []); setCarregando(false);
  }, []);
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return <Screen><AppHeader title="Contratos" subtitle="Documentos da carteira" contextTitle={`${contratos.length} contratos vinculados`} contextSubtitle="Acesso centralizado por cliente" icon="document-text-outline" /><FlatList contentContainerStyle={styles.content} data={contratos} keyExtractor={(item) => item.id}
    ListHeaderComponent={<View style={styles.heading}><Text style={styles.title}>Contratos dos clientes</Text><Text style={styles.subtitle}>Acesso fixo aos contratos vinculados à sua carteira.</Text></View>}
    renderItem={({ item }) => <Card><View style={styles.row}><View style={styles.icon}><Ionicons name="document-text-outline" size={22} color={Colors.primary} /></View><View style={styles.info}><Text style={styles.client}>{item.clientes?.nome ?? "Cliente"}</Text><Text style={styles.detail}>{item.numero ?? "Contrato sem número"}{item.clientes?.uc ? ` · UC ${item.clientes.uc}` : ""}</Text></View><Badge label={item.status ?? "Ativo"} variant="success" /></View></Card>}
    ListEmptyComponent={!carregando ? <EmptyState icon="document-text-outline" title="Nenhum contrato vinculado" subtitle="Os contratos cadastrados para os clientes aparecerão aqui." /> : null}
  /></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, heading: { marginBottom: Spacing.lg },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, color: Colors.subtitle, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center" }, icon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  info: { flex: 1, marginHorizontal: Spacing.sm }, client: { color: Colors.text, fontWeight: "700" }, detail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small },
});
