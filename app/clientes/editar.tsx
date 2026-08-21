import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { excluirCliente } from "../../services/clientes.service";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type Modalidade = "INJECAO" | "COMPENSACAO";

export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [nome, setNome] = useState(""); const [uc, setUc] = useState(""); const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState(""); const [cpf, setCpf] = useState(""); const [endereco, setEndereco] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("COMPENSACAO"); const [desconto, setDesconto] = useState("40");
  const [consumoMedio, setConsumoMedio] = useState("");
  const [loading, setLoading] = useState(true); const [salvando, setSalvando] = useState(false);

  useEffect(() => { supabase.from("clientes").select("*").eq("id", id).single().then(({ data: d }) => { if (d) { setNome(d.nome ?? ""); setUc(d.uc ?? ""); setTelefone(d.telefone ?? d.whatsapp ?? ""); setEmail(d.email ?? ""); setCpf(d.cpf ?? ""); setEndereco(d.endereco ?? ""); setModalidade(d.modalidade_faturamento ?? "COMPENSACAO"); setDesconto(String(d.desconto_percentual ?? 40)); setConsumoMedio(String(d.consumo_medio_kwh ?? 0)); } setLoading(false); }); }, [id]);

  async function salvar() {
    if (!nome.trim()) return Alert.alert("Nome obrigatório", "Informe o nome do cliente.");
    const percentual = Number(desconto.replace(",", "."));
    if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100) return Alert.alert("Desconto inválido", "Informe um percentual entre 0 e 100.");
    const consumoMedioKwh = Math.max(0, Number(consumoMedio.replace(",", ".")) || 0);
    setSalvando(true);
    const ucNormalizada = uc.replace(/\D/g, "");
    const { error } = await supabase.from("clientes").update({ nome: nome.trim(), uc: ucNormalizada || null, telefone, whatsapp: telefone.replace(/\D/g, ""), email: email.trim().toLowerCase(), cpf, endereco, consumo_medio_kwh: consumoMedioKwh, modalidade_faturamento: modalidade, desconto_percentual: percentual }).eq("id", id);
    if (error) {
      setSalvando(false);
      return Alert.alert("Não foi possível salvar", error.message);
    }
    const { error: erroUnidades } = await supabase.from("unidades_consumidoras").update({ modalidade_faturamento: modalidade, desconto_percentual: percentual }).eq("cliente_id", id);
    setSalvando(false);
    if (erroUnidades) Alert.alert("Cliente atualizado", "Os dados foram salvos, mas não foi possível sincronizar a modalidade das UCs.");
    else router.back();
  }

  function excluir() { Alert.alert("Excluir cliente", "Esta ação remove o cliente e seus vínculos. Deseja continuar?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: async () => { try { await excluirCliente(id); router.replace("/clientes"); } catch (erro: any) { Alert.alert("Não foi possível excluir", erro?.response?.data?.message ?? erro?.message); } } }]); }

  if (loading) return <Loading />;
  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Editar cliente" subtitle="Dados cadastrais" contextTitle="Editar cliente" contextSubtitle={nome || "Dados cadastrais do consumidor"} icon="create-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"><Text style={styles.eyebrow}>CADASTRO DO CLIENTE</Text><Text style={styles.title}>Editar cliente</Text><Text style={styles.subtitle}>Somente o nome é obrigatório. Atualize os demais dados quando precisar.</Text>
    <Card><FormField label="Nome" value={nome} onChangeText={setNome} /><FormField label="Unidade consumidora (opcional)" value={uc} onChangeText={(v) => setUc(v.replace(/\D/g, ""))} keyboardType="numeric" /><FormField label="Telefone / WhatsApp (opcional)" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" /><FormField label="E-mail (opcional)" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <ChoiceField label="Modalidade de faturamento" value={modalidade} onChange={setModalidade} options={[{ label: "Por injeção", value: "INJECAO" }, { label: "Por compensação", value: "COMPENSACAO" }]} /><FormField label="Consumo médio mensal (kWh)" value={consumoMedio} onChangeText={(valor) => setConsumoMedio(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" /><FormField label="Desconto contratado (%)" value={desconto} onChangeText={setDesconto} keyboardType="decimal-pad" /><FormField label="CPF / CNPJ (opcional)" value={cpf} onChangeText={setCpf} /><FormField label="Endereço (opcional)" value={endereco} onChangeText={setEndereco} />
      <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar alterações"} onPress={salvar} />
    </Card><View style={styles.dangerZone}><Text style={styles.dangerTitle}>Excluir cliente</Text><Text style={styles.dangerSubtitle}>Remova permanentemente o cliente e seus vínculos.</Text><Button title="Excluir cliente" onPress={excluir} style={styles.delete} /></View></ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
  dangerZone: { marginTop: Spacing.lg, padding: Spacing.lg, borderWidth: 1, borderColor: "#FECACA", borderRadius: Radius.xl, backgroundColor: "#FFF7F7" }, dangerTitle: { color: Colors.danger, fontSize: Typography.body, fontWeight: "800" }, dangerSubtitle: { marginTop: 3, marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.small }, delete: { backgroundColor: Colors.danger },
});
