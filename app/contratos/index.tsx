import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader, Badge, Card, ElasticFlatList as FlatList, EmptyState, Screen } from "../../components/ui";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function ContratosClientes() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.from("contratos").select("*, clientes(nome), unidades_consumidoras(numero, titular)").order("created_at", { ascending: false });
      if (error) throw error;
      setContratos((data ?? []).map((contrato) => ({
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
  }, []);
  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await carregar();
    } finally {
      setAtualizando(false);
    }
  }

  return <Screen><AppHeader title="Contratos" subtitle="Documentos da carteira" contextTitle={`${contratos.length} contratos vinculados`} contextSubtitle="Um contrato para cada unidade consumidora" icon="document-text-outline" /><FlatList contentContainerStyle={styles.content} data={contratos} keyExtractor={(item) => item.id}
    refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}
    ListHeaderComponent={<Card style={styles.heading}><Text style={styles.title}>Contratos das unidades</Text><Text style={styles.subtitle}>Acesse os contratos vinculados a cada unidade consumidora.</Text></Card>}
    renderItem={({ item }) => <Card><View style={styles.row}><View style={styles.icon}><Ionicons name="document-text-outline" size={22} color={Colors.primary} /></View><View style={styles.info}><Text style={styles.client}>{item.clientes?.nome ?? item.unidades_consumidoras?.titular ?? "Cliente"}</Text><Text style={styles.detail}>{item.numero ?? "Contrato sem número"}{item.unidades_consumidoras?.numero ? ` · UC ${item.unidades_consumidoras.numero}` : " · UC não vinculada"}</Text></View><Badge label={item.status ?? "Ativo"} variant="success" /></View></Card>}
    ListEmptyComponent={!carregando ? <EmptyState icon="document-text-outline" title="Nenhum contrato vinculado" subtitle="Os contratos cadastrados para os clientes aparecerão aqui." /> : null}
  /></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, heading: { marginBottom: Spacing.lg },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, color: Colors.subtitle, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center" }, icon: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  info: { flex: 1, marginHorizontal: Spacing.sm }, client: { color: Colors.text, fontWeight: "700" }, detail: { marginTop: 4, color: Colors.subtitle, fontSize: Typography.small },
});
