import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { criarFaturaManual } from "../../services/faturas.service";
import { Colors, Spacing, Typography } from "../../theme";

export default function CriarFaturaManual() {
  const [dados, setDados] = useState({ cliente: "", uc: "", referencia: "", vencimento: "", consumo: "", energiaCompensada: "", energiaInjetada: "", tarifaCheia: "", valorTotal: "", saldoAtual: "" });
  const [salvando, setSalvando] = useState(false);
  const campo = (nome: keyof typeof dados) => (valor: string) => setDados((atual) => ({ ...atual, [nome]: valor }));
  const numero = (valor: string) => Number(valor.replace(/\./g, "").replace(",", "."));

  async function salvar() {
    if (!dados.cliente.trim() || !dados.uc.trim() || !dados.referencia.trim() || !dados.vencimento.trim() || !dados.consumo || !dados.tarifaCheia || !dados.valorTotal) {
      return Alert.alert("Dados incompletos", "Preencha os campos obrigatórios antes de gerar a fatura.");
    }
    try {
      setSalvando(true);
      const resultado = await criarFaturaManual({
        ...dados,
        consumo: numero(dados.consumo), energiaCompensada: numero(dados.energiaCompensada), energiaInjetada: numero(dados.energiaInjetada),
        tarifaCheia: numero(dados.tarifaCheia), valorTotal: numero(dados.valorTotal), saldoAtual: numero(dados.saldoAtual),
      });
      if (resultado?.clienteNaoEncontrado) throw new Error("A UC informada ainda não está vinculada a um cliente.");
      Alert.alert("Fatura criada", "A cobrança manual foi registrada com sucesso.", [{ text: "OK", onPress: () => router.replace("/(tabs)/faturas") }]);
    } catch (erro: any) {
      Alert.alert("Não foi possível criar", erro?.response?.data?.message ?? erro?.message ?? "Revise os dados e tente novamente.");
    } finally { setSalvando(false); }
  }

  return <Screen><AppHeader variant="subpage" title="Faturamento manual" subtitle="Lançamento sem PDF" contextTitle="" contextSubtitle="" icon="create-outline" /><ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Criar fatura manualmente</Text><Text style={styles.subtitle}>Use os valores da competência. A UC precisa estar cadastrada e vinculada a uma usina.</Text>
    <Card>
      <FormField label="Nome do cliente *" value={dados.cliente} onChangeText={campo("cliente")} />
      <FormField label="Unidade consumidora *" value={dados.uc} onChangeText={(v) => campo("uc")(v.replace(/\D/g, ""))} keyboardType="numeric" />
      <FormField label="Competência (ex.: SET/2026) *" value={dados.referencia} onChangeText={campo("referencia")} autoCapitalize="characters" />
      <FormField label="Vencimento (DD/MM/AAAA) *" value={dados.vencimento} onChangeText={campo("vencimento")} keyboardType="numeric" />
      <FormField label="Consumo (kWh) *" value={dados.consumo} onChangeText={campo("consumo")} keyboardType="decimal-pad" />
      <FormField label="Energia compensada (kWh)" value={dados.energiaCompensada} onChangeText={campo("energiaCompensada")} keyboardType="decimal-pad" />
      <FormField label="Energia injetada (kWh)" value={dados.energiaInjetada} onChangeText={campo("energiaInjetada")} keyboardType="decimal-pad" />
      <FormField label="Tarifa cheia por kWh *" value={dados.tarifaCheia} onChangeText={campo("tarifaCheia")} keyboardType="decimal-pad" />
      <FormField label="Valor atual da concessionária *" value={dados.valorTotal} onChangeText={campo("valorTotal")} keyboardType="decimal-pad" />
      <FormField label="Saldo atual (kWh)" value={dados.saldoAtual} onChangeText={campo("saldoAtual")} keyboardType="decimal-pad" />
      <Button disabled={salvando} icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.surface} />} title={salvando ? "Gerando..." : "Gerar fatura"} onPress={salvar} />
    </Card>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: Spacing.lg, paddingBottom: Spacing.xxl * 2 }, title: { color: Colors.text, fontSize: Typography.title, fontWeight: "900" }, subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 } });
