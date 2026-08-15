import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import CadastroActions from "../../components/cadastro/CadastroActions";
import { AppHeader, Card, EmptyState, Screen } from "../../components/ui";
import { supabase } from "../../supabase";
import { Colors, Spacing, Typography } from "../../theme";

export default function Unidades() {
  const [unidades, setUnidades] = useState<any[]>([]);

  const carregar = useCallback(async () => {
    const { data } = await supabase.from("unidades_consumidoras")
      .select("*, clientes(nome), usinas(nome)").order("created_at", { ascending: false });
    setUnidades(data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  return (
    <Screen><AppHeader title="Unidades" subtitle="Carteira de energia" contextTitle={`${unidades.length} unidades cadastradas`} contextSubtitle="Consumidoras, beneficiárias e geradoras" icon="flash-outline" /><FlatList
      contentContainerStyle={styles.content}
      data={unidades}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<View><Text style={styles.title}>Unidades consumidoras</Text><Text style={styles.subtitle}>Cadastre manualmente ou leia os dados diretamente da fatura.</Text><CadastroActions tipo="UNIDADE" /></View>}
      renderItem={({ item }) => <Card>
        <View style={styles.row}><Text style={styles.number}>UC {item.numero}</Text><Text style={styles.badge}>{item.tipo}</Text></View>
        <Text style={styles.owner}>{item.clientes?.nome ?? item.usinas?.nome ?? item.titular ?? "Sem vínculo"}</Text>
        <Text style={styles.detail}>{item.modalidade_faturamento === "INJECAO" ? "Faturamento por injeção" : "Faturamento por compensação"} · {item.desconto_percentual}%</Text>
      </Card>}
      ListEmptyComponent={<View><EmptyState title="Nenhuma unidade cadastrada" subtitle="Use uma fatura da concessionária ou faça o cadastro manual." /></View>}
    /></Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "700" },
  subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  number: { color: Colors.text, fontSize: Typography.card, fontWeight: "700" }, badge: { color: Colors.primaryDark, fontSize: Typography.small, fontWeight: "700" },
  owner: { marginTop: Spacing.sm, color: Colors.text, fontWeight: "600" }, detail: { marginTop: Spacing.xs, color: Colors.subtitle },
});
