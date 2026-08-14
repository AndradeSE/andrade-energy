import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import { Button, Card, Screen } from "../../components/ui";
import { supabase } from "../../supabase";
import { Colors, Spacing, Typography } from "../../theme";

type Modalidade = "INJECAO" | "COMPENSACAO";
export default function NovoCliente() {
  const { origem, cliente, uc: ucImportada, endereco: enderecoImportado } = useLocalSearchParams<{ origem?: string; cliente?: string; uc?: string; endereco?: string }>();
  const [nome, setNome] = useState("");
  const [uc, setUc] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("COMPENSACAO");
  const [desconto, setDesconto] = useState("40");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (origem !== "fatura") return;
    setNome(cliente ?? "");
    setUc((ucImportada ?? "").replace(/\D/g, ""));
    setEndereco(enderecoImportado ?? "");
  }, [cliente, enderecoImportado, origem, ucImportada]);

  async function salvar() {
    const percentual = Number(desconto.replace(",", "."));
    if (!nome.trim()) return Alert.alert("Dados incompletos", "Informe o nome do cliente.");
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) return Alert.alert("Desconto inválido", "Informe um percentual entre 0 e 100.");
    setSalvando(true);
    const { data: cliente, error } = await supabase.from("clientes").insert({
      nome: nome.trim(), uc: uc || null, telefone, whatsapp: telefone.replace(/\D/g, ""), email: email.trim().toLowerCase(),
      cpf, endereco, distribuidora: "CEMIG", modalidade_faturamento: modalidade, desconto_percentual: percentual,
    }).select("id").single();

    if (!error && cliente && uc) {
      const { error: unidadeError } = await supabase.from("unidades_consumidoras").upsert({
        cliente_id: cliente.id, numero: uc, tipo: "BENEFICIARIA", titular: nome.trim(), distribuidora: "CEMIG",
        endereco: endereco || null, modalidade_faturamento: modalidade, desconto_percentual: percentual, status: "ATIVA",
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
        <FormField label="Nome" value={nome} onChangeText={setNome} />
        <FormField label="Unidade consumidora da fatura (opcional)" value={uc} onChangeText={(v) => setUc(v.replace(/\D/g, ""))} keyboardType="numeric" />
        <FormField label="Telefone / WhatsApp (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
        <FormField label="E-mail (opcional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <ChoiceField label="Modalidade de faturamento" value={modalidade} onChange={setModalidade} options={[{ label: "Por injeção", value: "INJECAO" }, { label: "Por compensação", value: "COMPENSACAO" }]} />
        <FormField label="Desconto contratado (%)" value={desconto} onChangeText={setDesconto} keyboardType="decimal-pad" />
        <FormField label="CPF / CNPJ (opcional)" value={cpf} onChangeText={setCpf} />
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
