import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import ChoiceField from "../../components/cadastro/ChoiceField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { useAuth } from "../../contexts/AuthContext";
import { buscarUsina as buscarUsinaRemota, editarUsina as editarUsinaRemota, excluirUsina as excluirUsinaRemota } from "../../services/usinas.service";
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
  const [titularidadeUcs, setTitularidadeUcs] = useState<"GERADOR" | "CLIENTE">("GERADOR");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [fotoCard, setFotoCard] = useState("");
  const chaveFotoCard = `foto-card-usina:${id}`;

  useEffect(() => {
    async function carregar() {
      let data: any;
      try {
        data = await buscarUsinaRemota(id);
      } catch {
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
      setTitularidadeUcs(data.titularidade_ucs_recebedoras === "CLIENTE" ? "CLIENTE" : "GERADOR");
      setCpfTitular(String(data.cpf_titular ?? "").replace(/\D/g, ""));
      setFotoCard((await AsyncStorage.getItem(chaveFotoCard)) ?? "");
    }
    carregar().finally(() => setLoading(false));
  }, [id]);

  async function alterarFotoCard() {
    const resultado = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, multiple: false });
    if (resultado.canceled || !resultado.assets?.[0]?.uri) return;
    try {
      const extensao = resultado.assets[0].name?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
      const destino = `${FileSystem.documentDirectory}card-usina-${id}.${extensao}`;
      await FileSystem.copyAsync({ from: resultado.assets[0].uri, to: destino });
      await AsyncStorage.setItem(chaveFotoCard, destino);
      setFotoCard(destino);
    } catch { Alert.alert("Não foi possível alterar o fundo", "Escolha outra imagem e tente novamente."); }
  }

  async function removerFotoCard() {
    await AsyncStorage.removeItem(chaveFotoCard);
    setFotoCard("");
  }

  async function salvar() {
    if (!nome.trim() || !numeroInstalacao) return Alert.alert("Dados incompletos", "Informe o nome e o número da instalação.");
    setSalvando(true);
    try {
      await editarUsinaRemota(id, {
        nome: nome.trim(), numero_instalacao: numeroInstalacao,
        potencia_kwp: Number(potencia.replace(",", ".")) || 0,
        geracao_media: Number(geracaoMedia.replace(",", ".")) || 0,
        investimento: numeroDaMoeda(investimento), tipo_gd: tipoGd,
        titularidade_ucs_recebedoras: titularidadeUcs,
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
      <Text style={styles.fieldLabel}>Fundo do card da usina</Text>
      <ImageBackground source={fotoCard ? { uri: fotoCard } : require("../../assets/images/usina-loading.jpeg")} imageStyle={styles.previewImage} style={styles.preview}>
        <View style={styles.previewOverlay}><Ionicons name="sunny" size={25} color="#FACC15" /><Text style={styles.previewText}>{nome || "Sua usina"}</Text></View>
      </ImageBackground>
      <View style={styles.photoActions}>
        <TouchableOpacity onPress={() => void alterarFotoCard()} style={styles.photoButton}><Ionicons name="image-outline" size={18} color={Colors.primary} /><Text style={styles.photoButtonText}>{fotoCard ? "Trocar imagem" : "Escolher imagem"}</Text></TouchableOpacity>
        {fotoCard ? <TouchableOpacity onPress={() => void removerFotoCard()} style={styles.removePhoto}><Ionicons name="close-circle-outline" size={18} color={Colors.danger} /><Text style={styles.removePhotoText}>Remover</Text></TouchableOpacity> : null}
      </View>
      <FormField label="Nome da usina" value={nome} onChangeText={setNome} />
      <FormField label="Número da instalação / UC" value={numeroInstalacao} onChangeText={(valor) => setNumeroInstalacao(valor.replace(/\D/g, ""))} keyboardType="numeric" />
      <FormField label="Potência (kWp)" value={potencia} onChangeText={setPotencia} keyboardType="decimal-pad" />
      <FormField label="Geração média (kWh/mês)" value={geracaoMedia} onChangeText={setGeracaoMedia} keyboardType="decimal-pad" />
      <ChoiceField label="Modalidade GD da usina" value={tipoGd} onChange={setTipoGd} options={[{ label: "GD I", value: "GD1" }, { label: "GD II", value: "GD2" }]} />
      <ChoiceField label="Titularidade das UCs" value={titularidadeUcs} onChange={(valor) => setTitularidadeUcs(valor as "GERADOR" | "CLIENTE")} options={[{ label: "Gerador", value: "GERADOR" }, { label: "Clientes", value: "CLIENTE" }]} />
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
  fieldLabel: { marginBottom: 7, color: Colors.text, fontSize: Typography.small, fontWeight: "800" }, preview: { height: 128, overflow: "hidden", justifyContent: "flex-end", marginBottom: Spacing.sm, borderRadius: Radius.lg }, previewImage: { borderRadius: Radius.lg }, previewOverlay: { flexDirection: "row", alignItems: "center", gap: 8, padding: Spacing.md, backgroundColor: "rgba(2,24,17,.48)" }, previewText: { flex: 1, color: "#FFF", fontSize: Typography.body, fontWeight: "900" }, photoActions: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg }, photoButton: { minHeight: 42, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md }, photoButtonText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" }, removePhoto: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: Spacing.sm }, removePhotoText: { color: Colors.danger, fontSize: Typography.small, fontWeight: "800" },
  dangerZone: { marginTop: Spacing.lg, padding: Spacing.lg, borderWidth: 1, borderColor: "#FECACA", borderRadius: Radius.xl, backgroundColor: "#FFF7F7" }, dangerHeading: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }, dangerText: { flex: 1, marginLeft: Spacing.sm }, dangerTitle: { color: Colors.danger, fontSize: Typography.body, fontWeight: "800" }, dangerSubtitle: { marginTop: 2, color: Colors.subtitle, fontSize: Typography.small }, deleteButton: { backgroundColor: Colors.danger },
});
