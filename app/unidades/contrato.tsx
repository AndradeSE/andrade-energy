import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ChoiceField from "../../components/cadastro/ChoiceField";
import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarContratoDaUnidade, gerarContratoDaUnidade, importarContratoAssinadoDaUnidade, salvarContratoDaUnidade } from "../../services/contratos.service";
import { buscarUnidade } from "../../services/clientes.service";
import { Colors, Spacing, Typography } from "../../theme";

type StatusContrato = "ATIVO" | "VIGENTE" | "VENCIDO";

function dataHoje() {
  return new Date().toLocaleDateString("pt-BR");
}

function dataParaFormulario(valor?: string | null) {
  if (!valor) return "";
  const encontrada = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  return encontrada ? `${encontrada[3]}/${encontrada[2]}/${encontrada[1]}` : valor;
}

function valorParaCampo(valor: unknown) {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "";
}

function lerNumero(valor: string) {
  return Number(valor.replace(/\./g, "").replace(",", ".")) || 0;
}

export default function ContratoDaUnidade() {
  const { id, numero, clienteId, cliente, descontoPadrao } = useLocalSearchParams<{
    id: string;
    numero: string;
    clienteId: string;
    cliente?: string;
    descontoPadrao?: string;
  }>();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [unidade, setUnidade] = useState<any>();
  const [numeroContrato, setNumeroContrato] = useState(`AE-${numero ?? "UC"}-${new Date().getFullYear()}`);
  const [termoAdesao, setTermoAdesao] = useState("");
  const [status, setStatus] = useState<StatusContrato>("ATIVO");
  const [desconto, setDesconto] = useState(String(descontoPadrao ?? "0"));
  const [inicio, setInicio] = useState(dataHoje());
  const [fim, setFim] = useState("");
  const [economiaMensal, setEconomiaMensal] = useState("");
  const [economiaAnual, setEconomiaAnual] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [locadorNome, setLocadorNome] = useState("Andrade Energy");
  const [locadorDocumento, setLocadorDocumento] = useState("");
  const [locadorEndereco, setLocadorEndereco] = useState("");
  const [prazoAnos, setPrazoAnos] = useState("10");
  const [foro, setForo] = useState("Itajubá/MG");
  const [gerando, setGerando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [contratoGeradoUrl, setContratoGeradoUrl] = useState<string>();
  const [contratoAssinadoUrl, setContratoAssinadoUrl] = useState<string>();

  useEffect(() => {
    if (!id) {
      setCarregando(false);
      return;
    }

    Promise.allSettled([buscarContratoDaUnidade(id), buscarUnidade(id)])
      .then(([resultadoContrato, resultadoUnidade]) => {
        if (resultadoUnidade.status === "fulfilled") setUnidade(resultadoUnidade.value);
        if (resultadoContrato.status !== "fulfilled") {
          if (resultadoUnidade.status !== "fulfilled") {
            throw resultadoContrato.reason;
          }
          return;
        }
        const contrato = resultadoContrato.value;
        if (!contrato) return;
        setNumeroContrato(contrato.numero ?? "");
        setTermoAdesao(contrato.termo_adesao ?? "");
        setStatus((["ATIVO", "VIGENTE", "VENCIDO"].includes(String(contrato.status).toUpperCase()) ? String(contrato.status).toUpperCase() : "ATIVO") as StatusContrato);
        setDesconto(valorParaCampo(contrato.desconto));
        setInicio(dataParaFormulario(contrato.vigencia_inicio ?? contrato.data_assinatura) || dataHoje());
        setFim(dataParaFormulario(contrato.vigencia_fim));
        setEconomiaMensal(valorParaCampo(contrato.economia_mensal_estimada));
        setEconomiaAnual(valorParaCampo(contrato.economia_anual_estimada));
        setObservacoes(contrato.observacoes ?? "");
        setLocadorNome(contrato.dados_documento?.locador_nome ?? "Andrade Energy");
        setLocadorDocumento(contrato.dados_documento?.locador_documento ?? "");
        setLocadorEndereco(contrato.dados_documento?.locador_endereco ?? "");
        setPrazoAnos(String(contrato.dados_documento?.prazo_anos ?? "10"));
        setForo(contrato.dados_documento?.foro ?? "Itajubá/MG");
        setContratoGeradoUrl(contrato.contrato_gerado_url ?? undefined);
        setContratoAssinadoUrl(contrato.contrato_assinado_url ?? undefined);
      })
      .catch((erro: any) => {
        Alert.alert("Não foi possível carregar o contrato", erro?.response?.data?.message ?? "Tente novamente.");
      })
      .finally(() => setCarregando(false));
  }, [clienteId, id]);

  function atualizarEconomiaMensal(valor: string) {
    const limpa = valor.replace(/[^\d,.]/g, "");
    setEconomiaMensal(limpa);
    const mensal = lerNumero(limpa);
    if (mensal > 0) setEconomiaAnual((mensal * 12).toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
  }

  function dadosParaSalvar() {
    return {
      numero: numeroContrato,
      termo_adesao: termoAdesao,
      status,
      desconto,
      data_assinatura: inicio,
      vigencia_inicio: inicio,
      vigencia_fim: fim,
      economia_mensal_estimada: economiaMensal,
      economia_anual_estimada: economiaAnual,
      observacoes,
      dados_documento: {
        locador_nome: locadorNome,
        locador_documento: locadorDocumento,
        locador_endereco: locadorEndereco,
        prazo_anos: prazoAnos,
        foro,
        locatario_nome: nomeCliente,
        locatario_documento: dadosCliente?.cpf ?? "",
        endereco_uc: enderecoContrato,
      },
    };
  }

  function validarDados() {
    if (!id) {
      Alert.alert("Unidade não encontrada", "Volte à lista e abra a UC novamente.");
      return false;
    }
    if (!numeroContrato.trim()) {
      Alert.alert("Informe o contrato", "O número do contrato é obrigatório.");
      return false;
    }
    if (!locadorNome.trim()) {
      Alert.alert("Informe o locador", "O nome ou razão social do locador é obrigatório para gerar a minuta.");
      return false;
    }
    return true;
  }

  async function salvar() {
    if (!validarDados()) return;

    try {
      setSalvando(true);
      await salvarContratoDaUnidade(id, dadosParaSalvar());
      Alert.alert("Contrato salvo", "As informações já estarão disponíveis na aba Contrato do aplicativo do cliente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (erro: any) {
      Alert.alert("Não foi possível salvar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function gerarMinuta() {
    if (!validarDados()) return;
    try {
      setGerando(true);
      const contrato = await gerarContratoDaUnidade(id, dadosParaSalvar());
      setContratoGeradoUrl(contrato.contrato_gerado_url ?? undefined);
      setContratoAssinadoUrl(contrato.contrato_assinado_url ?? undefined);
      Alert.alert("Minuta gerada", "Revise os dados e as cláusulas antes de colher as assinaturas.");
      if (contrato.contrato_gerado_url) await Linking.openURL(contrato.contrato_gerado_url);
    } catch (erro: any) {
      Alert.alert("Não foi possível gerar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  async function importarAssinado() {
    if (!id) return;
    try {
      const resultado = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
      if (resultado.canceled || !resultado.assets?.[0]) return;
      setImportando(true);
      const contrato = await importarContratoAssinadoDaUnidade(id, resultado.assets[0]);
      setContratoAssinadoUrl(contrato.contrato_assinado_url ?? undefined);
      Alert.alert("Contrato assinado vinculado", "Este PDF agora é o documento oficial desta UC.");
    } catch (erro: any) {
      Alert.alert("Não foi possível importar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setImportando(false);
    }
  }

  if (carregando) return <Loading />;

  const dadosCliente = unidade?.clientes;
  const enderecoContrato = unidade?.endereco ?? dadosCliente?.endereco ?? "Endereço não informado";
  const nomeCliente = dadosCliente?.nome ?? cliente ?? "Cliente não informado";
  const documentoCliente = dadosCliente?.cpf ? `CPF/CNPJ: ${dadosCliente.cpf}` : "CPF/CNPJ não informado";

  return (
    <Screen>
      {IS_GERADOR_APP ? <AppHeader variant="subpage" title="Contrato da unidade" subtitle="Dados contratuais" contextTitle={`Contrato da UC ${numero}`} contextSubtitle={nomeCliente} icon="document-text-outline" /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>CONTRATO DO CLIENTE</Text>
          <Text style={styles.title}>Contrato da UC {numero}</Text>
          <Text style={styles.subtitle}>Confira os dados que serão exibidos no contrato antes de gerar ou anexar a versão assinada.</Text>
        </View>

        <Card style={styles.context}>
          <Ionicons name="flash-outline" size={21} color={Colors.primary} />
          <View style={styles.contextText}>
            <Text style={styles.contextLabel}>UNIDADE CONSUMIDORA</Text>
            <Text style={styles.contextValue}>UC {numero} · {unidade?.distribuidora ?? "Concessionária não informada"}</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>DADOS QUE APARECERÃO NO CONTRATO</Text>
        <Card style={styles.partyCard}>
          <InfoContrato label="Cliente" value={nomeCliente} />
          <InfoContrato label="Documento" value={documentoCliente} />
          <InfoContrato label="Endereço da unidade" value={enderecoContrato} />
          <InfoContrato label="Usina vinculada" value={unidade?.usinas?.nome ?? unidade?.usina_nome ?? (unidade?.usina_id ? "Usina vinculada" : "Usina não informada")} />
          <Text style={styles.editHint}>Para corrigir nome, endereço ou dados da UC, use Configurar UC ou Editar cliente antes de gerar o contrato.</Text>
        </Card>

        <Text style={styles.sectionTitle}>DADOS DO LOCADOR E VIGÊNCIA</Text>
        <Card style={styles.formCard}>
          <FormField label="Nome ou razão social do locador *" value={locadorNome} onChangeText={setLocadorNome} placeholder="Ex.: Andrade Energy" />
          <FormField label="CPF/CNPJ do locador" value={locadorDocumento} onChangeText={setLocadorDocumento} placeholder="Para constar no contrato" />
          <FormField label="Endereço do locador" value={locadorEndereco} onChangeText={setLocadorEndereco} placeholder="Endereço completo" />
          <FormField label="Prazo do contrato (anos)" value={prazoAnos} onChangeText={(valor) => setPrazoAnos(valor.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="10" />
          <FormField label="Foro" value={foro} onChangeText={setForo} placeholder="Cidade/UF" />
        </Card>

        <Card>
          <FormField label="Número do contrato *" value={numeroContrato} onChangeText={setNumeroContrato} placeholder="Ex.: AE-2026-001" />
          <FormField label="Termo de adesão" value={termoAdesao} onChangeText={setTermoAdesao} placeholder="Ex.: Termo assinado digitalmente" />
          <ChoiceField label="Status" value={status} onChange={setStatus} options={[{ label: "Ativo", value: "ATIVO" }, { label: "Vigente", value: "VIGENTE" }, { label: "Vencido", value: "VENCIDO" }]} />
          <FormField label="Desconto contratado (%)" value={desconto} onChangeText={(valor) => setDesconto(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" placeholder="0" />
          <FormField label="Início da vigência" value={inicio} onChangeText={setInicio} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
          <FormField label="Vencimento do contrato" value={fim} onChangeText={setFim} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
          <FormField label="Economia mensal estimada (R$)" value={economiaMensal} onChangeText={atualizarEconomiaMensal} keyboardType="decimal-pad" placeholder="0,00" />
          <FormField label="Economia anual estimada (R$)" value={economiaAnual} onChangeText={(valor) => setEconomiaAnual(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" placeholder="0,00" />
          <FormField label="Observações" value={observacoes} onChangeText={setObservacoes} placeholder="Informações adicionais para o contrato" multiline numberOfLines={3} textAlignVertical="top" />
          <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar contrato"} icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.surface} />} onPress={salvar} />
        </Card>

        <View style={styles.documentActions}>
          <Button disabled={gerando} title={gerando ? "Gerando minuta..." : "Gerar minuta do contrato"} icon={<Ionicons name="document-text-outline" size={20} color={Colors.surface} />} onPress={gerarMinuta} />
          {contratoGeradoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoGeradoUrl)} style={styles.documentLink}><Ionicons name="download-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Abrir minuta gerada</Text></TouchableOpacity> : null}
          <Button disabled={importando} title={importando ? "Importando contrato..." : "Importar contrato assinado"} icon={<Ionicons name="attach-outline" size={20} color={Colors.surface} />} onPress={importarAssinado} />
          {contratoAssinadoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoAssinadoUrl)} style={styles.signedLink}><Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Contrato assinado vinculado à UC</Text></TouchableOpacity> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function InfoContrato({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoContrato}><Text style={styles.infoContratoLabel}>{label}</Text><Text style={styles.infoContratoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  heading: { marginBottom: Spacing.lg },
  eyebrow: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800", letterSpacing: 1.1 },
  title: { marginTop: Spacing.xs, color: Colors.text, fontSize: Typography.title, fontWeight: "900" },
  subtitle: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 20 },
  context: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg },
  contextText: { flex: 1, marginLeft: Spacing.sm },
  contextLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  contextValue: { marginTop: 3, color: Colors.text, fontSize: Typography.body, fontWeight: "700" },
  sectionTitle: { marginBottom: Spacing.sm, color: Colors.subtitle, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  partyCard: { marginBottom: Spacing.lg, paddingVertical: Spacing.xs },
  formCard: { marginBottom: Spacing.lg },
  infoContrato: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoContratoLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  infoContratoValue: { marginTop: 3, color: Colors.text, fontSize: Typography.small, fontWeight: "700", lineHeight: 19 },
  editHint: { margin: Spacing.md, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 18 },
  documentActions: { gap: Spacing.sm, marginTop: Spacing.lg },
  documentLink: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs },
  signedLink: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, borderRadius: 10, backgroundColor: Colors.primaryLight },
  documentLinkText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" },
});
