import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import EnderecoFields from "../../components/cadastro/EnderecoFields";
import { cpfValido, formatarCpf, nomeCompletoValido, enderecoVazio, lerEndereco, erroEndereco, serializarEndereco } from "../../utils/cadastroCliente";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarCliente, editarCliente, excluirCliente } from "../../services/clientes.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { emailValido, normalizarEmail } from "../../utils/email";

export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [nome, setNome] = useState(""); const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState(""); const [cpf, setCpf] = useState(""); const [endereco, setEndereco] = useState({ ...enderecoVazio });
  const [loading, setLoading] = useState(true); const [salvando, setSalvando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState("");

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErroCarregamento("");
    if (!id) { setErroCarregamento("Cliente não encontrado."); setLoading(false); return; }
    buscarCliente(id).then((d) => {
      if (!ativo) return;
      setNome(d.nome ?? ""); setTelefone(d.telefone ?? d.whatsapp ?? "");
      setEmail(d.email ?? ""); const documento = String(d.cpf ?? d.cpf_cnpj ?? ""); setCpf(documento.replace(/\D/g, "").length > 11 ? documento : formatarCpf(documento)); setEndereco(lerEndereco(d.endereco ?? ""));
    }).catch((erro: any) => {
      if (ativo) setErroCarregamento(erro?.response?.data?.message ?? "Não foi possível carregar o cadastro. Volte e tente novamente.");
    }).finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [id]);

  async function salvar() {
    if (loading || erroCarregamento || !id) return Alert.alert("Cadastro indisponível", "Os dados do cliente não foram carregados. Volte e tente novamente.");
    if (!nomeCompletoValido(nome)) return Alert.alert("Nome completo obrigatório", "Informe o nome e o sobrenome do cliente.");
    if (!cpfValido(cpf)) return Alert.alert("CPF inválido", "Confira os 11 números e os dígitos verificadores do CPF.");
    if (erroEndereco(endereco)) return Alert.alert("Endereço obrigatório", erroEndereco(endereco));
    if (!emailValido(email)) return Alert.alert("E-mail obrigatório", "Informe um endereço de e-mail válido para enviar o contrato e o convite.");
    setSalvando(true);
    try {
      await editarCliente(id, { nome: nome.trim(), telefone, whatsapp: telefone.replace(/\D/g, ""), email: normalizarEmail(email), cpf: cpf.replace(/\D/g, ""), endereco: serializarEndereco(endereco) });
      router.back();
    } catch (erro: any) {
      setSalvando(false);
      return Alert.alert("Não foi possível salvar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    }
    setSalvando(false);
  }

  function excluir() { Alert.alert("Excluir cliente", "O cliente só poderá ser excluído quando todos os contratos estiverem cancelados ou encerrados. Deseja verificar?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: async () => { try { await excluirCliente(id); router.replace("/clientes"); } catch (erro: any) { const mensagem = erro?.response?.data?.message ?? erro?.message; Alert.alert("Não foi possível excluir", mensagem, erro?.response?.data?.code === "CLIENTE_COM_CONTRATO_ATIVO" ? [{ text: "Fechar" }, { text: "Ver contratos", onPress: () => router.push("/contratos" as any) }] : [{ text: "OK" }]); } } }]); }

  if (loading) return <Loading />;
  if (erroCarregamento) return <Screen><Card><Text style={styles.title}>Cadastro indisponível</Text><Text style={styles.subtitle}>{erroCarregamento}</Text><Button title="Voltar" onPress={() => router.back()} /></Card></Screen>;
  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Editar cliente" subtitle="Dados cadastrais" contextTitle="Editar cliente" contextSubtitle={nome || "Dados cadastrais do consumidor"} icon="create-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"><Text style={styles.eyebrow}>CADASTRO DO CLIENTE</Text><Text style={styles.title}>Editar cliente</Text><Text style={styles.subtitle}>Confira nome completo, CPF e endereço. O contrato utiliza o endereço deste cadastro.</Text>
    <Card><FormField label="Nome e sobrenome" required value={nome} onChangeText={setNome} autoCapitalize="words" /><FormField label="Telefone / WhatsApp (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" /><FormField label="E-mail" required value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <FormField label="CPF" required value={cpf} onChangeText={v => setCpf(formatarCpf(v))} keyboardType="number-pad" maxLength={14} />
    </Card>
    <Card><Text style={styles.sectionTitle}>Endereço do cliente</Text><Text style={styles.sectionHint}>Informe o CEP para preencher rua, bairro, cidade e estado. Confira e complete o número.</Text><EnderecoFields value={endereco} onChange={setEndereco} /></Card>
    <Card><Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar alterações"} onPress={salvar} /></Card>
    <View style={styles.dangerZone}><Text style={styles.dangerTitle}>Excluir cliente</Text><Text style={styles.dangerSubtitle}>Remova permanentemente o cliente e seus vínculos.</Text><Button title="Excluir cliente" onPress={excluir} style={styles.delete} /></View></ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 }, sectionTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800", marginBottom: Spacing.xs }, sectionHint: { color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18, marginBottom: Spacing.md },
  dangerZone: { marginTop: Spacing.lg, padding: Spacing.lg, borderWidth: 1, borderColor: "#FECACA", borderRadius: Radius.xl, backgroundColor: "#FFF7F7" }, dangerTitle: { color: Colors.danger, fontSize: Typography.body, fontWeight: "800" }, dangerSubtitle: { marginTop: 3, marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.small }, delete: { backgroundColor: Colors.danger },
});
