import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Button, EmptyState, Loading, Screen } from "../../components/ui";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type ClienteAlocacao = {
  id: string;
  nome: string;
  cpf?: string | null;
  uc?: string | null;
  usina_id?: string | null;
  percentual_rateio?: number | null;
};

export default function AlocarClientes() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const [clientes, setClientes] = useState<ClienteAlocacao[]>([]);
  const [selecionados, setSelecionados] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    supabase.from("clientes").select("id,nome,cpf,uc,usina_id,percentual_rateio").order("nome").then(({ data, error }) => {
      if (error) Alert.alert("Não foi possível carregar", error.message);
      const lista = (data ?? []) as ClienteAlocacao[];
      setClientes(lista);
      setSelecionados(Object.fromEntries(lista.filter((cliente) => cliente.usina_id === id).map((cliente) => [cliente.id, String(cliente.percentual_rateio ?? "")])))
      setLoading(false);
    });
  }, [id]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return clientes.filter((cliente) => `${cliente.nome} ${cliente.cpf ?? ""} ${cliente.uc ?? ""}`.toLocaleLowerCase("pt-BR").includes(termo));
  }, [busca, clientes]);

  const total = Object.values(selecionados).reduce((soma, valor) => soma + (Number(String(valor).replace(",", ".")) || 0), 0);

  function alternar(cliente: ClienteAlocacao) {
    setSelecionados((atual) => {
      const proximo = { ...atual };
      if (Object.prototype.hasOwnProperty.call(proximo, cliente.id)) delete proximo[cliente.id];
      else proximo[cliente.id] = "";
      return proximo;
    });
  }

  async function salvar() {
    const ids = Object.keys(selecionados);
    if (!ids.length) return Alert.alert("Selecione os clientes", "Marque ao menos um cliente para alocar nesta usina.");
    const percentuais = ids.map((clienteId) => Number(String(selecionados[clienteId]).replace(",", ".")) || 0);
    if (percentuais.some((valor) => valor <= 0)) return Alert.alert("Percentual obrigatório", "Informe o percentual de todos os clientes selecionados.");
    if (total > 100.001) return Alert.alert("Rateio inválido", "A soma dos percentuais não pode ultrapassar 100%.");
    try {
      setSalvando(true);
      const anteriormenteAlocados = clientes.filter((cliente) => cliente.usina_id === id && !ids.includes(cliente.id));
      for (const cliente of anteriormenteAlocados) {
        const { error } = await supabase.from("clientes").update({ usina_id: null, percentual_rateio: null }).eq("id", cliente.id).eq("usina_id", id);
        if (error) throw error;
        await supabase.from("unidades_consumidoras").update({ usina_id: null }).eq("cliente_id", cliente.id).eq("usina_id", id);
      }
      for (const clienteId of ids) {
        const percentual = Number(String(selecionados[clienteId]).replace(",", "."));
        const { error } = await supabase.from("clientes").update({ usina_id: id, percentual_rateio: percentual }).eq("id", clienteId);
        if (error) throw error;
        const { error: erroUnidade } = await supabase.from("unidades_consumidoras").update({ usina_id: id }).eq("cliente_id", clienteId);
        if (erroUnidade) throw erroUnidade;
      }
      Alert.alert("Alocação salva", `${ids.length} cliente${ids.length === 1 ? "" : "s"} vinculado${ids.length === 1 ? "" : "s"} à usina.`, [{ text: "OK", onPress: () => router.back() }]);
    } catch (erro: any) {
      Alert.alert("Não foi possível salvar", erro?.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (loading) return <Loading />;
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color={Colors.text} /></TouchableOpacity>
    <Text style={styles.eyebrow}>ALOCAÇÃO DE ENERGIA</Text><Text style={styles.title}>{nome ?? "Usina"}</Text><Text style={styles.subtitle}>Selecione os clientes e distribua até 100% da energia injetada.</Text>
    <View style={styles.search}><Ionicons name="search-outline" size={20} color={Colors.subtitle} /><TextInput value={busca} onChangeText={setBusca} placeholder="Buscar por nome, CPF ou UC" placeholderTextColor={Colors.subtitle} style={styles.searchInput} /></View>
    <View style={[styles.total, total > 100 && styles.totalInvalid]}><Text style={styles.totalLabel}>Total alocado</Text><Text style={styles.totalValue}>{total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</Text></View>
    {filtrados.length ? filtrados.map((cliente) => {
      const marcado = Object.prototype.hasOwnProperty.call(selecionados, cliente.id);
      return <View key={cliente.id} style={[styles.clientCard, marcado && styles.clientSelected]}><TouchableOpacity onPress={() => alternar(cliente)} style={styles.clientMain}><View style={[styles.check, marcado && styles.checkSelected]}>{marcado ? <Ionicons name="checkmark" size={17} color={Colors.surface} /> : null}</View><View style={styles.clientInfo}><Text style={styles.clientName}>{cliente.nome}</Text><Text style={styles.clientDetail}>{cliente.uc ? `UC ${cliente.uc}` : "Sem UC principal"}{cliente.cpf ? ` · ${cliente.cpf}` : ""}</Text></View></TouchableOpacity>{marcado ? <View style={styles.percentRow}><Text style={styles.percentLabel}>Percentual da energia</Text><View style={styles.percentInput}><TextInput value={selecionados[cliente.id]} onChangeText={(valor) => setSelecionados((atual) => ({ ...atual, [cliente.id]: valor.replace(/[^\d,.]/g, "") }))} keyboardType="decimal-pad" placeholder="0" style={styles.input} /><Text style={styles.percentSymbol}>%</Text></View></View> : null}</View>;
    }) : <EmptyState icon="people-outline" title="Nenhum cliente encontrado" subtitle="Altere os termos da busca ou cadastre um cliente." />}
    <Button disabled={salvando} title={salvando ? "Salvando alocação..." : "Salvar alocação"} onPress={salvar} style={styles.save} />
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, back: { width: 42, height: 42, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md, borderRadius: Radius.round, backgroundColor: Colors.surface }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.1 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "900" }, subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 20 }, search: { minHeight: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface }, searchInput: { flex: 1, marginLeft: Spacing.xs, color: Colors.text }, total: { flexDirection: "row", justifyContent: "space-between", marginVertical: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: Colors.primaryLight }, totalInvalid: { backgroundColor: "#FEE2E2" }, totalLabel: { color: Colors.text, fontWeight: "700" }, totalValue: { color: Colors.primaryDark, fontWeight: "900" }, clientCard: { marginBottom: Spacing.sm, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: "#DEE0E3" }, clientSelected: { borderColor: Colors.primary }, clientMain: { flexDirection: "row", alignItems: "center" }, check: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.subtitle, borderRadius: 8 }, checkSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary }, clientInfo: { flex: 1, marginLeft: Spacing.sm }, clientName: { color: Colors.text, fontWeight: "800" }, clientDetail: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small }, percentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }, percentLabel: { color: Colors.subtitle, fontSize: Typography.small }, percentInput: { width: 100, height: 42, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surface }, input: { flex: 1, color: Colors.text, fontWeight: "800", textAlign: "right" }, percentSymbol: { marginLeft: 4, color: Colors.subtitle, fontWeight: "800" }, save: { marginTop: Spacing.md },
});
