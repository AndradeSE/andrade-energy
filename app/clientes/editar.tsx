import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import ChoiceField from "../../components/cadastro/ChoiceField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { excluirCliente } from "../../services/clientes.service";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { emailOpcionalValido, normalizarEmail } from "../../utils/email";

export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [nome, setNome] = useState(""); const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState(""); const [cpf, setCpf] = useState(""); const [endereco, setEndereco] = useState("");
  const [titularidadeFaturamento, setTitularidadeFaturamento] = useState<"GERADOR" | "CLIENTE">("GERADOR");
  const [loading, setLoading] = useState(true); const [salvando, setSalvando] = useState(false);

  useEffect(() => { supabase.from("clientes").select("*").eq("id", id).single().then(({ data: d }) => { if (d) { setNome(d.nome ?? ""); setTelefone(d.telefone ?? d.whatsapp ?? ""); setEmail(d.email ?? ""); setCpf(d.cpf ?? ""); setEndereco(d.endereco ?? ""); setTitularidadeFaturamento(d.titularidade_faturamento === "CLIENTE" ? "CLIENTE" : "GERADOR"); } setLoading(false); }); }, [id]);

  async function salvar() {
    if (!nome.trim()) return Alert.alert("Nome obrigatório", "Informe o nome do cliente.");
    if (!emailOpcionalValido(email)) return Alert.alert("E-mail inválido", "Informe um endereço de e-mail válido ou deixe o campo vazio.");
    setSalvando(true);
    const { error } = await supabase.from("clientes").update({ nome: nome.trim(), telefone, whatsapp: telefone.replace(/\D/g, ""), email: normalizarEmail(email) || null, cpf, endereco, titularidade_faturamento: titularidadeFaturamento }).eq("id", id);
    if (error) {
      setSalvando(false);
      return Alert.alert("Não foi possível salvar", error.message);
    }
    setSalvando(false);
    router.back();
  }

  function excluir() { Alert.alert("Excluir cliente", "Esta ação remove o cliente e seus vínculos. Deseja continuar?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: async () => { try { await excluirCliente(id); router.replace("/clientes"); } catch (erro: any) { Alert.alert("Não foi possível excluir", erro?.response?.data?.message ?? erro?.message); } } }]); }

  if (loading) return <Loading />;
  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Editar cliente" subtitle="Dados cadastrais" contextTitle="Editar cliente" contextSubtitle={nome || "Dados cadastrais do consumidor"} icon="create-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"><Text style={styles.eyebrow}>CADASTRO DO CLIENTE</Text><Text style={styles.title}>Editar cliente</Text><Text style={styles.subtitle}>Somente o nome é obrigatório. Atualize os demais dados quando precisar.</Text>
    <Card><FormField label="Nome" value={nome} onChangeText={setNome} /><FormField label="Telefone / WhatsApp (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" /><FormField label="E-mail (opcional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <FormField label="CPF / CNPJ (opcional)" value={cpf} onChangeText={setCpf} /><FormField label="Endereço (opcional)" value={endereco} onChangeText={setEndereco} />
      <ChoiceField label="Titularidade das UCs recebedoras" value={titularidadeFaturamento} onChange={(valor) => setTitularidadeFaturamento(valor as "GERADOR" | "CLIENTE")} options={[{ label: "Gerador", value: "GERADOR" }, { label: "Cliente", value: "CLIENTE" }]} />
      <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar alterações"} onPress={salvar} />
    </Card><View style={styles.dangerZone}><Text style={styles.dangerTitle}>Excluir cliente</Text><Text style={styles.dangerSubtitle}>Remova permanentemente o cliente e seus vínculos.</Text><Button title="Excluir cliente" onPress={excluir} style={styles.delete} /></View></ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
  dangerZone: { marginTop: Spacing.lg, padding: Spacing.lg, borderWidth: 1, borderColor: "#FECACA", borderRadius: Radius.xl, backgroundColor: "#FFF7F7" }, dangerTitle: { color: Colors.danger, fontSize: Typography.body, fontWeight: "800" }, dangerSubtitle: { marginTop: 3, marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.small }, delete: { backgroundColor: Colors.danger },
});
