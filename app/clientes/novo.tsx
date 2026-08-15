import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";

import FormField from "../../components/cadastro/FormField";
import { Button, Card, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";
import { Colors, Spacing, Typography } from "../../theme";

export default function NovoCliente() {
  const { usuario } = useAuth();
  const { origem, cliente, uc: ucImportada, endereco: enderecoImportado } = useLocalSearchParams<{ origem?: string; cliente?: string; uc?: string; endereco?: string }>();
  const [nome, setNome] = useState("");
  const [uc, setUc] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (origem !== "fatura") return;
    setNome(cliente ?? "");
    setUc((ucImportada ?? "").replace(/\D/g, ""));
    setEndereco(enderecoImportado ?? "");
  }, [cliente, enderecoImportado, origem, ucImportada]);

  async function salvar() {
    if (!nome.trim()) return Alert.alert("Dados incompletos", "Informe o nome do cliente.");
    const cpfConta = usuario?.cpf?.replace(/\D/g, "") ?? "";
    if (cpfConta.length !== 11) return Alert.alert("CPF não encontrado", "Atualize o CPF da conta antes de cadastrar o cliente.");
    setSalvando(true);
    const dadosCliente = {
      nome: nome.trim(),
      uc: uc || null,
      telefone: telefone.trim() || null,
      whatsapp: telefone.replace(/\D/g, "") || null,
      email: usuario?.email?.trim().toLowerCase() || null,
      cpf: cpfConta,
      endereco: endereco.trim() || null,
      distribuidora: "CEMIG",
    };
    const { data: existente, error: buscaError } = await supabase
      .from("clientes")
      .select("id")
      .eq("cpf", cpfConta)
      .limit(1)
      .maybeSingle();
    if (buscaError) {
      setSalvando(false);
      return Alert.alert("Não foi possível verificar o CPF", buscaError.message);
    }
    const operacao = existente
      ? supabase.from("clientes").update(dadosCliente).eq("id", existente.id).select("id").single()
      : supabase.from("clientes").insert(dadosCliente).select("id").single();
    const { data: cliente, error } = await operacao;

    if (!error && cliente && uc) {
      const { error: unidadeError } = await supabase.from("unidades_consumidoras").upsert({
        cliente_id: cliente.id, numero: uc, tipo: "BENEFICIARIA", titular: nome.trim(), distribuidora: "CEMIG",
        endereco: endereco.trim() || null, status: "ATIVA",
      }, { onConflict: "numero" });
      if (unidadeError) Alert.alert("Cliente salvo", "O cliente foi criado, mas a unidade precisa ser vinculada novamente.");
      else router.back();
    } else if (!error) router.back();
    else Alert.alert("Não foi possível salvar", error.message);
    setSalvando(false);
  }

  return (
    <Screen><ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>{origem === "fatura" ? "DADOS LIDOS DA FATURA" : "CADASTRO MANUAL"}</Text>
      <Text style={styles.title}>Novo cliente</Text>
      <Text style={styles.subtitle}>Somente o nome é obrigatório. Os demais dados podem ser preenchidos ou alterados depois.</Text>
      <Card>
        <FormField label="Nome (obrigatório)" value={nome} onChangeText={setNome} />
        <FormField label="Unidade consumidora da fatura (opcional)" value={uc} onChangeText={(v) => setUc(v.replace(/\D/g, ""))} keyboardType="numeric" />
        <FormField label="Telefone / WhatsApp (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
        <FormField label="Endereço (opcional)" value={endereco} onChangeText={setEndereco} />
        <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar cliente"} onPress={salvar} />
      </Card>
    </ScrollView></Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "700", letterSpacing: 1.2 },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "700" },
  subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
});
