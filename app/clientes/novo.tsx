import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";

import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { supabase } from "../../supabase";
import { Colors, Spacing, Typography } from "../../theme";
import { emailOpcionalValido, normalizarEmail } from "../../utils/email";
import { anexarFaturaCliente } from "../../services/clientes.service";

export default function NovoCliente() {
  const { origem, cliente, nome: nomeImportado, cpf: cpfImportado, endereco: enderecoImportado, arquivoUri, arquivoNome } = useLocalSearchParams<{ origem?: string; cliente?: string; nome?: string; cpf?: string; endereco?: string; arquivoUri?: string; arquivoNome?: string }>();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (origem !== "fatura") return;
    const nomeExtraido = (cliente ?? nomeImportado ?? "").trim();
    const invalido = /d[eé]bito\s+autom[aá]tico|valor\s+a\s+pagar|vencimento/i.test(nomeExtraido);
    setNome(invalido ? "" : nomeExtraido);
    setCpf(String(cpfImportado ?? "").replace(/\D/g, ""));
    setEndereco(enderecoImportado ?? "");
  }, [cliente, cpfImportado, enderecoImportado, nomeImportado, origem]);

  async function salvar() {
    if (origem !== "fatura") return Alert.alert("Fatura obrigatória", "Cadastre o consumidor por convite ou selecione uma fatura da unidade consumidora.");
    if (!arquivoUri) return Alert.alert("Fatura obrigatória", "Selecione novamente a fatura CEMIG usada neste cadastro.");
    if (!nome.trim()) return Alert.alert("Nome obrigatório", "Informe o nome do consumidor.");
    if (!emailOpcionalValido(email)) return Alert.alert("E-mail inválido", "Informe um endereço de e-mail válido ou deixe o campo vazio.");
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo && ![11, 14].includes(cpfLimpo.length)) return Alert.alert("Documento inválido", "Informe um CPF ou CNPJ válido.");
    setSalvando(true);

    const dados = {
      nome: nome.trim(), cpf: cpfLimpo || null, email: normalizarEmail(email) || null,
      telefone: telefone.trim() || null, whatsapp: telefone.replace(/\D/g, "") || null,
      endereco: endereco.trim() || null, status: "ATIVO",
    };

    let clienteId: string | undefined;
    if (cpfLimpo) {
      const { data: existente } = await supabase.from("clientes").select("id").eq("cpf", cpfLimpo).limit(1).maybeSingle();
      if (existente) {
        const { data, error } = await supabase.from("clientes").update(dados).eq("id", existente.id).select("id").single();
        if (error) { setSalvando(false); return Alert.alert("Não foi possível salvar", error.message); }
        clienteId = data.id;
      }
    }

    if (!clienteId) {
      const { data, error } = await supabase.from("clientes").insert(dados).select("id").single();
      if (error) { setSalvando(false); return Alert.alert("Não foi possível salvar", error.message); }
      clienteId = data.id;
    }

    try {
      await anexarFaturaCliente(String(clienteId), { uri: arquivoUri, name: arquivoNome || "fatura-cemig.pdf", mimeType: "application/pdf" });
      setSalvando(false);
      Alert.alert("Cliente e UC cadastrados", "A fatura foi anexada e a unidade consumidora foi criada automaticamente.", [{ text: "OK", onPress: () => router.replace(`/clientes/${clienteId}`) }]);
    } catch (erro: any) {
      setSalvando(false);
      Alert.alert("Cliente salvo, mas a UC não foi criada", erro?.response?.data?.message ?? "Confira a fatura e tente novamente.");
    }
  }

  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Novo consumidor" subtitle="Cadastro da carteira" contextTitle="Novo consumidor" contextSubtitle={origem === "fatura" ? "Dados lidos da conta de energia" : "Cadastro manual"} icon="person-add-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>{origem === "fatura" ? "DADOS LIDOS DA FATURA" : "CADASTRO MANUAL"}</Text>
    <Text style={styles.title}>Novo consumidor</Text>
    <Text style={styles.subtitle}>{origem === "fatura" ? "Confira os dados. Ao salvar, a fatura será anexada e a UC será criada automaticamente." : "O cadastro de consumidor começa pelo convite; a fatura da UC é obrigatória na criação da conta."}</Text>
    <Card>
      <FormField label="Nome (obrigatório)" value={nome} onChangeText={setNome} />
      <FormField label="CPF / CNPJ (opcional)" value={cpf} onChangeText={(valor) => setCpf(valor.replace(/\D/g, ""))} keyboardType="numeric" />
      <FormField label="E-mail (opcional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <FormField label="Telefone / WhatsApp (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
       <FormField label="Endereço (opcional)" value={endereco} onChangeText={setEndereco} />
      <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar consumidor"} onPress={salvar} />
    </Card>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
});
