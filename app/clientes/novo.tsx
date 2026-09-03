import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { Colors, Spacing, Typography } from "../../theme";
import { emailOpcionalValido, normalizarEmail } from "../../utils/email";
import { anexarFaturaCliente, criarCliente } from "../../services/clientes.service";

export default function NovoCliente() {
  const { origem, cliente, nome: nomeImportado, cpf: cpfImportado, endereco: enderecoImportado, arquivoUri, arquivoNome } = useLocalSearchParams<{ origem?: string; cliente?: string; nome?: string; cpf?: string; endereco?: string; arquivoUri?: string; arquivoNome?: string }>();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [pdf, setPdf] = useState<DocumentPicker.DocumentPickerAsset | null>(arquivoUri ? { uri: arquivoUri, name: arquivoNome || "fatura-cemig.pdf", mimeType: "application/pdf" } as DocumentPicker.DocumentPickerAsset : null);

  useEffect(() => {
    if (origem !== "fatura") return;
    const nomeExtraido = (cliente ?? nomeImportado ?? "").trim();
    const invalido = /d[eé]bito\s+autom[aá]tico|valor\s+a\s+pagar|vencimento/i.test(nomeExtraido);
    setNome(invalido ? "" : nomeExtraido);
    setCpf(String(cpfImportado ?? "").replace(/\D/g, ""));
    setEndereco(enderecoImportado ?? "");
  }, [cliente, cpfImportado, enderecoImportado, nomeImportado, origem]);

  async function salvar() {
    if (!pdf?.uri) return Alert.alert("Fatura obrigatória", "O gerador deve anexar a fatura CEMIG para cadastrar o cliente e criar a UC.");
    if (!nome.trim()) return Alert.alert("Nome obrigatório", "Informe o nome do consumidor.");
    if (!normalizarEmail(email) || !emailOpcionalValido(email)) return Alert.alert("E-mail obrigatório", "Informe um endereço de e-mail válido para enviar o convite depois.");
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return Alert.alert("CPF obrigatório", "Informe um CPF válido com 11 números.");
    setSalvando(true);

    const dados = {
      nome: nome.trim(), cpf: cpfLimpo || null, email: normalizarEmail(email) || null,
      telefone: telefone.trim() || null, whatsapp: telefone.replace(/\D/g, "") || null,
      endereco: endereco.trim() || null, status: "ATIVO",
    };

    try {
      const clienteCriado = await criarCliente(dados);
      const clienteId = String(clienteCriado.id);
      await anexarFaturaCliente(String(clienteId), { uri: pdf.uri, name: pdf.name || "fatura-cemig.pdf", mimeType: pdf.mimeType || "application/pdf" });
      setSalvando(false);
      Alert.alert("Cliente e UC cadastrados", "A fatura foi anexada e a unidade consumidora foi criada automaticamente.", [{ text: "OK", onPress: () => router.replace(`/clientes/${clienteId}`) }]);
    } catch (erro: any) {
      setSalvando(false);
      Alert.alert("Não foi possível cadastrar", erro?.response?.data?.message ?? "Confira os dados e a fatura e tente novamente.");
    }
  }

  async function escolherFatura() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true, multiple: false });
    if (!resultado.canceled) setPdf(resultado.assets[0]);
  }

  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Novo consumidor" subtitle="Cadastro da carteira" contextTitle="Novo consumidor" contextSubtitle={origem === "fatura" ? "Dados lidos da conta de energia" : "Cadastro manual"} icon="person-add-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>{origem === "fatura" ? "DADOS LIDOS DA FATURA" : "CADASTRO MANUAL"}</Text>
    <Text style={styles.title}>Novo consumidor</Text>
    <Text style={styles.subtitle}>{origem === "fatura" ? "Confira os mesmos dados do cadastro manual. A fatura já selecionada será usada para criar a UC." : "Cadastre os dados do cliente e anexe obrigatoriamente a fatura que criará a primeira UC."}</Text>
    <Card>
      <FormField label="Nome (obrigatório)" value={nome} onChangeText={setNome} />
      <FormField label="CPF (obrigatório)" value={cpf} onChangeText={(valor) => setCpf(valor.replace(/\D/g, "").slice(0, 11))} keyboardType="numeric" />
      <FormField label="E-mail (obrigatório)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <FormField label="Telefone / WhatsApp (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" />
      <TouchableOpacity activeOpacity={0.82} onPress={escolherFatura} style={[styles.pdfButton, pdf && styles.pdfButtonSelected]}>
        <Ionicons name={pdf ? "document-text" : "document-attach-outline"} size={22} color={Colors.primary} />
        <View style={styles.pdfCopy}><Text numberOfLines={1} style={styles.pdfTitle}>{pdf?.name ?? "Anexar fatura CEMIG"}</Text><Text style={styles.pdfHint}>{origem === "fatura" ? "Fatura usada neste cadastro" : "Obrigatória para cadastrar a UC"}</Text></View>
      </TouchableOpacity>
      <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar consumidor"} onPress={salvar} />
    </Card>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 }, pdfButton: { minHeight: 68, flexDirection: "row", alignItems: "center", marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, backgroundColor: Colors.surface }, pdfButtonSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight }, pdfCopy: { flex: 1, marginLeft: Spacing.sm }, pdfTitle: { color: Colors.text, fontWeight: "800" }, pdfHint: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small },
});
