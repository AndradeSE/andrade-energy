import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";

import FormField from "../../components/cadastro/FormField";
import { Button, Card, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { processarFatura } from "../../services/faturas.service";
import { supabase } from "../../supabase";
import { Colors, Spacing, Typography } from "../../theme";

export default function NovoCliente() {
  const { usinaSelecionada, usuario } = useAuth();
  const { origem, cliente, nome: nomeImportado, uc: ucImportada, numeroInstalacao, endereco: enderecoImportado, distribuidora: distribuidoraImportada, arquivoUri, arquivoNome } = useLocalSearchParams<{ origem?: string; cliente?: string; nome?: string; uc?: string; numeroInstalacao?: string; endereco?: string; distribuidora?: string; arquivoUri?: string; arquivoNome?: string }>();
  const [nome, setNome] = useState("");
  const [uc, setUc] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [distribuidora, setDistribuidora] = useState("CEMIG");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (origem !== "fatura") return;
    const nomeExtraido = (cliente ?? nomeImportado ?? "").trim();
    const invalido = /d[eé]bito\s+autom[aá]tico|valor\s+a\s+pagar|vencimento/i.test(nomeExtraido);
    setNome(invalido ? "" : nomeExtraido);
    setUc((ucImportada ?? numeroInstalacao ?? "").replace(/\D/g, ""));
    setEndereco(enderecoImportado ?? "");
    setDistribuidora(distribuidoraImportada ?? "CEMIG");
  }, [cliente, distribuidoraImportada, enderecoImportado, nomeImportado, numeroInstalacao, origem, ucImportada]);

  async function salvar() {
    if (!nome.trim()) return Alert.alert("Nome obrigatório", "Informe o nome do consumidor.");
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo && ![11, 14].includes(cpfLimpo.length)) return Alert.alert("Documento inválido", "Informe um CPF ou CNPJ válido.");
    setSalvando(true);

    const dados = {
      nome: nome.trim(), cpf: cpfLimpo || null, email: email.trim().toLowerCase() || null,
      telefone: telefone.trim() || null, whatsapp: telefone.replace(/\D/g, "") || null,
      uc: uc || null, endereco: endereco.trim() || null, distribuidora,
      usina_id: usinaSelecionada?.id ?? usuario?.usina_id ?? null, status: "ATIVO",
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

    if (uc) {
      const { error } = await supabase.from("unidades_consumidoras").upsert({
        cliente_id: clienteId, usina_id: usinaSelecionada?.id ?? usuario?.usina_id ?? null,
        numero: uc, tipo: "BENEFICIARIA", titular: nome.trim(), distribuidora,
        endereco: endereco.trim() || null, modalidade_faturamento: "COMPENSACAO", status: "ATIVA",
      }, { onConflict: "numero" });
      if (error) Alert.alert("Consumidor salvo", "O consumidor foi criado, mas a UC precisa ser vinculada novamente.");
    }

    if (origem === "fatura" && arquivoUri) {
      try {
        await processarFatura(arquivoUri, arquivoNome);
      } catch (erro: any) {
        Alert.alert("Consumidor salvo", erro?.response?.data?.message ?? "O cadastro foi concluído, mas não foi possível guardar a fatura.");
      }
    }

    setSalvando(false);
    router.back();
  }

  return <Screen><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>{origem === "fatura" ? "DADOS LIDOS DA FATURA" : "CADASTRO MANUAL"}</Text>
    <Text style={styles.title}>Novo consumidor</Text>
    <Text style={styles.subtitle}>{origem === "fatura" ? "Confira os dados extraídos antes de salvar." : "Somente o nome é obrigatório. Os demais dados podem ser preenchidos depois."}</Text>
    <Card>
      <FormField label="Nome (obrigatório)" value={nome} onChangeText={setNome} />
      <FormField label="CPF / CNPJ (opcional)" value={cpf} onChangeText={(valor) => setCpf(valor.replace(/\D/g, ""))} keyboardType="numeric" />
      <FormField label="E-mail (opcional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <FormField label="Telefone / WhatsApp (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
      <FormField label="Unidade consumidora (opcional)" value={uc} onChangeText={(valor) => setUc(valor.replace(/\D/g, ""))} keyboardType="numeric" />
      <FormField label="Concessionária" value={distribuidora} onChangeText={setDistribuidora} />
      <FormField label="Endereço (opcional)" value={endereco} onChangeText={setEndereco} />
      <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar consumidor"} onPress={salvar} />
    </Card>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
});
