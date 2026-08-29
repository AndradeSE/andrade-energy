import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppHeader, ElasticScrollView as ScrollView, Screen } from "../components/ui";
import { Colors, Radius, Spacing, Typography } from "../theme";

type Item = { icon: keyof typeof Ionicons.glyphMap; label: string; detalhe: string; rota: string };

const itens: Record<string, Item[]> = {
  consumidor: [
    { icon: "receipt-outline", label: "Faturas", detalhe: "Abertas, vencidas e pagas", rota: "/faturas" },
    { icon: "document-attach-outline", label: "Contas de luz", detalhe: "Documentos da concessionária", rota: "/contas-de-luz" },
    { icon: "trending-up-outline", label: "Economia", detalhe: "Histórico e economia acumulada", rota: "/(tabs)/economia" },
    { icon: "document-text-outline", label: "Contrato", detalhe: "Condições e unidades vinculadas", rota: "/contrato" },
    { icon: "person-outline", label: "Perfil", detalhe: "Dados pessoais e segurança", rota: "/perfil" },
  ],
  usinas: [
    { icon: "people-outline", label: "Clientes", detalhe: "Carteira de consumidores", rota: "/clientes" },
    { icon: "business-outline", label: "Usinas", detalhe: "Ativos de geração", rota: "/usinas" },
    { icon: "flash-outline", label: "Unidades consumidoras", detalhe: "Todas as UCs vinculadas", rota: "/unidades" },
    { icon: "receipt-outline", label: "Faturas", detalhe: "Cobranças da carteira", rota: "/faturas" },
    { icon: "document-text-outline", label: "Contratos", detalhe: "Contratos por unidade", rota: "/contratos" },
    { icon: "analytics-outline", label: "Operação", detalhe: "Competências processadas", rota: "/(tabs)/operacao" },
    { icon: "wallet-outline", label: "Financeiro", detalhe: "Receita e carteira", rota: "/financeiro" },
    { icon: "card-outline", label: "Minha assinatura", detalhe: "Plano e vencimentos", rota: "/assinatura" },
  ],
  comercial: [
    { icon: "business-outline", label: "Geradores", detalhe: "Contas e assinaturas", rota: "/geradores/gestao" },
    { icon: "pulse-outline", label: "Clientes ativos", detalhe: "Dias decorridos e vencimentos", rota: "/geradores/monitoramento" },
    { icon: "cash-outline", label: "Pagamentos", detalhe: "Cobranças e faturamento", rota: "/geradores/gestao?aba=PAGAMENTOS" },
    { icon: "layers-outline", label: "Empresas parceiras", detalhe: "Administração multiempresa", rota: "/admin/empresas" },
    { icon: "person-add-outline", label: "Convidar gerador", detalhe: "Criar novo acesso", rota: "/geradores/convidar" },
    { icon: "download-outline", label: "Compartilhar aplicativos", detalhe: "Apps Gerador e Consumidor", rota: "/admin/comercial" },
    { icon: "person-outline", label: "Perfil administrativo", detalhe: "Dados e segurança", rota: "/admin/perfil?origem=comercial" },
  ],
};

export default function Pesquisa() {
  const { perfil = "usinas" } = useLocalSearchParams<{ perfil?: string }>();
  const [busca, setBusca] = useState("");
  const lista = itens[perfil] ?? itens.usinas;
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return termo ? lista.filter((item) => `${item.label} ${item.detalhe}`.toLocaleLowerCase("pt-BR").includes(termo)) : lista;
  }, [busca, lista]);

  return <Screen>
    <AppHeader variant="subpage" title="Pesquisar" subtitle="Navegação rápida" contextTitle="Pesquisa" contextSubtitle="Encontre qualquer área" icon="search-outline" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.searchBox}><Ionicons name="search-outline" size={21} color={Colors.subtitle} /><TextInput autoFocus placeholder="O que você procura?" placeholderTextColor={Colors.subtitle} value={busca} onChangeText={setBusca} style={styles.input} /></View>
      <Text style={styles.hint}>{filtrados.length} resultado{filtrados.length === 1 ? "" : "s"}</Text>
      {filtrados.map((item) => <TouchableOpacity activeOpacity={0.82} key={item.label} onPress={() => router.push(item.rota as any)} style={styles.item}>
        <View style={styles.icon}><Ionicons name={item.icon} size={21} color={Colors.primary} /></View><View style={styles.copy}><Text style={styles.label}>{item.label}</Text><Text style={styles.detail}>{item.detalhe}</Text></View><Ionicons name="chevron-forward" size={19} color={Colors.subtitle} />
      </TouchableOpacity>)}
      {!filtrados.length ? <View style={styles.empty}><Ionicons name="search-outline" size={34} color={Colors.subtitle} /><Text style={styles.emptyTitle}>Nenhum resultado</Text><Text style={styles.detail}>Tente pesquisar com outra palavra.</Text></View> : null}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  searchBox: { height: 54, flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  input: { flex: 1, color: Colors.text, fontSize: Typography.body },
  hint: { marginVertical: Spacing.md, color: Colors.subtitle, fontSize: Typography.small, fontWeight: "700" },
  item: { minHeight: 72, flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  icon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  copy: { flex: 1, marginLeft: Spacing.sm }, label: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" }, detail: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
  empty: { alignItems: "center", paddingVertical: Spacing.xxl }, emptyTitle: { marginTop: Spacing.sm, marginBottom: 3, color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
});
