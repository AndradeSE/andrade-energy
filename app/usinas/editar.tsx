import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import ChoiceField from "../../components/cadastro/ChoiceField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useAuth } from "../../contexts/AuthContext";
import { editarUsina as editarUsinaRemota, excluirUsina as excluirUsinaRemota } from "../../services/usinas.service";
import { supabase } from "../../supabase";
import { Colors, Radius, Spacing, Typography } from "../../theme";

const formatarMoeda = (valor: unknown) => Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const moedaDigitada = (valor: string) => formatarMoeda(Number(valor.replace(/\D/g, "")) / 100);
const numeroDaMoeda = (valor: string) => Number(valor.replace(/[^\d,]/g, "").replace(",", ".")) || 0;

export default function EditarUsina() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario, usinaSelecionada, selecionarUsina, atualizarUsuario } = useAuth();
  const [nome, setNome] = useState("");
  const [numeroInstalacao, setNumeroInstalacao] = useState("");
  const [potencia, setPotencia] = useState("");
  const [geracaoMedia, setGeracaoMedia] = useState("");
  const [investimento, setInvestimento] = useState("");
  const [titular, setTitular] = useState("");
  const [cpfTitular, setCpfTitular] = useState("");
  const [endereco, setEndereco] = useState("");
  const [tipoGd, setTipoGd] = useState<"GD1" | "GD2">("GD1");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase.from("usinas").select("*").eq("id", id).single();
      if (error || !data) {
        Alert.alert("Usina não encontrada", "Não foi possível carregar os dados da usina.");
        router.back();
        return;
      }
      setNome(data.nome ?? "");
      setNumeroInstalacao(String(data.numero_instalacao ?? data.ponto_instalacao ?? "").replace(/\D/g, ""));
      setPotencia(String(data.potencia_kwp ?? ""));
      setGeracaoMedia(String(data.geracao_media ?? ""));
      setInvestimento(formatarMoeda(data.investimento ?? 0));
      setTitular(data.titular_nome ?? "");
      setEndereco(data.endereco ?? "");
      setTipoGd(data.tipo_gd === "GD2" ? "GD2" : "GD1");
      const { data: unidadeGeradora } = await supabase
        .from("unidades_consumidoras")
        .select("cpf_titular")
        .eq("usina_id", id)
        .eq("tipo", "GERADORA")
        .maybeSingle();
      setCpfTitular(String(unidadeGeradora?.cpf_titular ?? "").replace(/\D/g, ""));
    }
    carregar().finally(() => setLoading(false));
  }, [id]);

  async function salvar() {
    if (!nome.trim() || !numeroInstalacao) return Alert.alert("Dados incompletos", "Informe o nome e o número da instalação.");
    setSalvando(true);
    try {
      await editarUsinaRemota(id, {
        nome: nome.trim(), numero_instalacao: numeroInstalacao,
        potencia_kwp: Number(potencia.replace(",", ".")) || 0,
        geracao_media: Number(geracaoMedia.replace(",", ".")) || 0,
        investimento: numeroDaMoeda(investimento), tipo_gd: tipoGd,
        titular_nome: titular.trim() || null, cpf_titular: cpfTitular.replace(/\D/g, "") || null,
        endereco: endereco.trim() || null,
      });
      router.back();
    } catch (erro: any) {
      Alert.alert("Não foi possível salvar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert("Excluir usina", "A usina e seus vínculos serão removidos. Esta ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir usina", style: "destructive", onPress: excluir },
    ]);
  }

  async function excluir() {
    setExcluindo(true);
    let error: any;
    try {
      await excluirUsinaRemota(id);
    } catch (erro) {
      error = erro;
    }
    setExcluindo(false);
    if (error) return Alert.alert("Não foi possível excluir", error?.response?.data?.message ?? error.message);
    if (usuario?.usina_id === id) await atualizarUsuario({ usina_id: null });
    if (usinaSelecionada?.id === id) selecionarUsina(null);
    router.replace("/selecionar-unidade");
  }

  if (loading) return <Loading />;
  return <Screen>{IS_GERADOR_APP ? <AppHeader variant="subpage" title="Editar usina" subtitle="Dados da geração" contextTitle={nome || "Editar usina"} contextSubtitle={`UC ${numeroInstalacao || "não informada"}`} icon="sunny-outline" /> : null}<ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>CADASTRO DA USINA</Text><Text style={styles.title}>Editar usina</Text><Text style={styles.subtitle}>Atualize os dados técnicos e cadastrais da unidade geradora.</Text>
    <Card>
      <FormField label="Nome da usina" value={nome} onChangeText={setNome} />
      <FormField label="Número da instalação / UC" value={numeroInstalacao} onChangeText={(valor) => setNumeroInstalacao(valor.replace(/\D/g, ""))} keyboardType="numeric" />
      <FormField label="Potência (kWp)" value={potencia} onChangeText={setPotencia} keyboardType="decimal-pad" />
      <FormField label="Geração média (kWh/mês)" value={geracaoMedia} onChangeText={setGeracaoMedia} keyboardType="decimal-pad" />
      <ChoiceField label="Modalidade GD da usina" value={tipoGd} onChange={setTipoGd} options={[{ label: "GD I", value: "GD1" }, { label: "GD II", value: "GD2" }]} />
      <FormField label="Investimento" value={investimento} onChangeText={(valor) => setInvestimento(moedaDigitada(valor))} keyboardType="numeric" />
      <FormField label="Titular" value={titular} onChangeText={setTitular} />
      <FormField label="CPF/CNPJ do titular da conta (para e-mail)" value={cpfTitular} onChangeText={(valor) => setCpfTitular(valor.replace(/\D/g, "").slice(0, 14))} keyboardType="numeric" />
      <FormField label="Endereço" value={endereco} onChangeText={setEndereco} />
      <Button disabled={salvando || excluindo} title={salvando ? "Salvando..." : "Salvar alterações"} onPress={salvar} />
    </Card>
    <View style={styles.dangerZone}><View style={styles.dangerHeading}><Ionicons name="trash-outline" size={21} color={Colors.danger} /><View style={styles.dangerText}><Text style={styles.dangerTitle}>Excluir usina</Text><Text style={styles.dangerSubtitle}>Remova esta usina permanentemente.</Text></View></View><Button disabled={salvando || excluindo} title={excluindo ? "Excluindo..." : "Excluir usina"} onPress={confirmarExclusao} style={styles.deleteButton} /></View>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.2 }, title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "800" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.lg, color: Colors.subtitle, lineHeight: 21 },
  dangerZone: { marginTop: Spacing.lg, padding: Spacing.lg, borderWidth: 1, borderColor: "#FECACA", borderRadius: Radius.xl, backgroundColor: "#FFF7F7" }, dangerHeading: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }, dangerText: { flex: 1, marginLeft: Spacing.sm }, dangerTitle: { color: Colors.danger, fontSize: Typography.body, fontWeight: "800" }, dangerSubtitle: { marginTop: 2, color: Colors.subtitle, fontSize: Typography.small }, deleteButton: { backgroundColor: Colors.danger },
});
