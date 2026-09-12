import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarContratoDaUnidade, buscarDadosIniciaisContrato, buscarResumoPropostaDaUnidade, gerarContratoDaUnidade, importarContratoAssinadoDaUnidade, salvarContratoDaUnidade } from "../../services/contratos.service";
import { enviarContratoEConvite, validarAssinaturaExterna } from "../../services/contratos.service";
import { buscarUnidade } from "../../services/clientes.service";
import { buscarUsina } from "../../services/usinas.service";
import { Colors, Spacing, Typography } from "../../theme";

type StatusContrato = "ATIVO" | "VIGENTE" | "VENCIDO";

function dataHoje() {
  return new Date().toLocaleDateString("pt-BR");
}

function somarAnos(data: string, anos: string) {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data.trim());
  const quantidade = Number(anos);
  if (!partes || !Number.isInteger(quantidade) || quantidade <= 0) return "";
  const resultado = new Date(Number(partes[3]) + quantidade, Number(partes[2]) - 1, Number(partes[1]));
  return resultado.toLocaleDateString("pt-BR");
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

function primeirosDigitosDocumento(valor: unknown) {
  const digitos = String(valor ?? "").replace(/\D/g, "");
  return digitos.length >= 4 ? `${digitos.slice(0, 4)}***` : "Não informado";
}

export default function ContratoDaUnidade() {
  const { id, numero, clienteId, cliente, descontoPadrao, revisao } = useLocalSearchParams<{
    id: string;
    numero: string;
    clienteId: string;
    cliente?: string;
    descontoPadrao?: string;
    revisao?: string;
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
  const [contratoId, setContratoId] = useState<string>();
  const [aceiteRegistrado, setAceiteRegistrado] = useState(false);
  const [novoContrato, setNovoContrato] = useState(false);
  const [assinaturaPendente, setAssinaturaPendente] = useState(false);
  const [dadosDaMinutaRevisada, setDadosDaMinutaRevisada] = useState<string>();
  const [titularidadeUcs, setTitularidadeUcs] = useState("GERADOR");

  useEffect(() => {
    setNovoContrato(String(revisao ?? "") === "1");
    if (!id) {
      setCarregando(false);
      return;
    }

    Promise.allSettled([buscarContratoDaUnidade(id, String(revisao ?? "") === "1"), buscarUnidade(id), buscarDadosIniciaisContrato(id), buscarResumoPropostaDaUnidade(id)])
      .then(async ([resultadoContrato, resultadoUnidade, resultadoDados, resultadoProposta]) => {
        let unidadeCarregada: any;
        if (resultadoUnidade.status === "fulfilled") {
          unidadeCarregada = resultadoUnidade.value;
          // Garante o nome mesmo para UCs legadas em que a relação não veio no retorno.
          if (unidadeCarregada?.usina_id && !unidadeCarregada?.usinas?.nome && !unidadeCarregada?.usina_nome) {
            try {
              const usina = await buscarUsina(unidadeCarregada.usina_id);
              unidadeCarregada = { ...unidadeCarregada, usinas: usina, usina_nome: usina?.nome };
            } catch {
              // Mantém os demais dados da UC disponíveis mesmo se a consulta da usina falhar.
            }
          }
          setUnidade(unidadeCarregada);
        }
        if (resultadoDados.status === "fulfilled") {
          const iniciais = resultadoDados.value;
          setLocadorNome(iniciais?.locador?.nome ?? "Andrade Energy");
          setLocadorDocumento(iniciais?.locador?.documento ?? "");
          setLocadorEndereco(iniciais?.locador?.endereco ?? "");
          setTitularidadeUcs(iniciais?.titularidadeUcs === "CLIENTE" ? "CLIENTE" : "GERADOR");
        }
        const propostaAtual = resultadoProposta.status === "fulfilled" && resultadoProposta.value
          ? resultadoProposta.value
          : resultadoDados.status === "fulfilled" ? resultadoDados.value?.proposta : null;
        if (propostaAtual) {
          setEconomiaMensal(valorParaCampo(propostaAtual.economiaMensalEstimada));
          setEconomiaAnual(valorParaCampo(propostaAtual.economiaAnualEstimada));
        }
        if (resultadoContrato.status !== "fulfilled") {
          if (resultadoUnidade.status !== "fulfilled") {
            throw resultadoContrato.reason;
          }
          return;
        }
        const contrato = resultadoContrato.value;
        if (!contrato) return;
        setContratoId(contrato.id);
        setAceiteRegistrado(Boolean(contrato.aceite_cliente_em));
        setAssinaturaPendente(Boolean(contrato.dados_documento?.assinatura_externa_pendente));
        const revisandoContratoAssinado = String(revisao ?? "") === "1"
          && Boolean(contrato.aceite_cliente_em || contrato.contrato_assinado_url || String(contrato.status).toUpperCase() === "VIGENTE");
        setNumeroContrato(revisandoContratoAssinado ? `AE-${numero ?? unidadeCarregada?.numero ?? "UC"}-${new Date().getFullYear()}-R${Number(contrato.versao ?? 1) + 1}` : contrato.numero ?? "");
        setTermoAdesao(contrato.termo_adesao ?? "");
        setStatus((["ATIVO", "VIGENTE", "VENCIDO"].includes(String(contrato.status).toUpperCase()) ? String(contrato.status).toUpperCase() : "ATIVO") as StatusContrato);
        setDesconto(revisandoContratoAssinado ? valorParaCampo(unidadeCarregada?.desconto_percentual ?? descontoPadrao) : valorParaCampo(contrato.desconto));
        setInicio(dataParaFormulario(contrato.vigencia_inicio ?? contrato.data_assinatura) || dataHoje());
        setFim(dataParaFormulario(contrato.vigencia_fim));
        if (!propostaAtual) {
          setEconomiaMensal(valorParaCampo(contrato.economia_mensal_estimada));
          setEconomiaAnual(valorParaCampo(contrato.economia_anual_estimada));
        }
        setObservacoes(contrato.observacoes ?? "");
        if (resultadoDados.status !== "fulfilled") {
          setLocadorNome(contrato.dados_documento?.locador_nome ?? "Andrade Energy");
          setLocadorDocumento(contrato.dados_documento?.locador_documento ?? "");
          setLocadorEndereco(contrato.dados_documento?.locador_endereco ?? "");
        }
        setPrazoAnos(String(contrato.dados_documento?.prazo_anos ?? "10"));
        setForo(contrato.dados_documento?.foro ?? "Itajubá/MG");
        setContratoGeradoUrl(revisandoContratoAssinado ? undefined : contrato.contrato_gerado_url ?? undefined);
        setContratoAssinadoUrl(revisandoContratoAssinado ? undefined : contrato.contrato_assinado_url ?? undefined);
      })
      .catch((erro: any) => {
        Alert.alert("Não foi possível carregar o contrato", erro?.response?.data?.message ?? "Tente novamente.");
      })
      .finally(() => setCarregando(false));
  }, [clienteId, id, revisao]);

  useEffect(() => {
    const vencimento = somarAnos(inicio, prazoAnos);
    if (vencimento) setFim(vencimento);
  }, [inicio, prazoAnos]);

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
        titularidade_ucs: titularidadeUcs,
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
      Alert.alert("Rascunho salvo", "Os dados foram salvos sem enviar e-mail. Revise a minuta antes de enviar o contrato e o convite.", [
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
      const dadosMinuta = dadosParaSalvar();
      const contrato = await gerarContratoDaUnidade(id, dadosMinuta);
      setDadosDaMinutaRevisada(JSON.stringify(dadosMinuta));
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

  function enviarParaAnalise() {
    if (dadosDaMinutaRevisada !== JSON.stringify(dadosParaSalvar())) {
      Alert.alert("Revise a minuta atual", "Gere e abra a minuta com os dados atuais antes de enviar o convite.");
      return;
    }
    Alert.alert("Enviar documentos", "Será enviada a última minuta gerada com a proposta desta UC. O convite de acesso só será criado se este cliente ainda não tiver recebido um. Se alterou os dados, gere e revise a minuta novamente antes de enviar.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Enviar", onPress: async () => {
        try {
          setGerando(true);
          const resultado = await enviarContratoEConvite(id);
          Alert.alert(resultado.emailEnviado ? "Documentos enviados" : "Envio não concluído", resultado.emailEnviado ? "O contrato foi enviado ao cliente. Próximo passo: agora é só aguardar a assinatura. A UC continuará bloqueada para faturamento até o aceite." : "Não foi possível entregar o e-mail. Tente reenviar.");
        } catch (erro: any) {
          Alert.alert("Não foi possível enviar", erro?.response?.data?.message || "Tente novamente.");
        } finally { setGerando(false); }
      } },
    ]);
  }

  async function importarAssinado() {
    if (!id) return;
    try {
      const resultado = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
      if (resultado.canceled || !resultado.assets?.[0]) return;
      setImportando(true);
      const contrato = await importarContratoAssinadoDaUnidade(id, resultado.assets[0]);
      setContratoAssinadoUrl(contrato.contrato_assinado_url ?? undefined);
      setContratoId(contrato.id);
      setAssinaturaPendente(true);
      Alert.alert("PDF recebido para conferência", "Abra o documento e confira os dados e as assinaturas. Depois use Validar assinaturas para liberar esta UC.");
    } catch (erro: any) {
      Alert.alert("Não foi possível importar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setImportando(false);
    }
  }

  function confirmarAssinaturaExterna() {
    if (!contratoId || gerando) return;
    Alert.alert("Validar assinaturas", "Confirma que abriu o PDF e conferiu os dados desta UC e as assinaturas das partes? Essa conferência manual libera o acesso à unidade.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Conferi e confirmo", onPress: async () => {
        try {
          setGerando(true);
          await validarAssinaturaExterna(contratoId);
          setAssinaturaPendente(false);
          Alert.alert("Conferência registrada", "O acesso a esta UC foi liberado.");
        } catch (erro: any) {
          Alert.alert("Não foi possível validar", erro?.response?.data?.message ?? "Tente novamente.");
        } finally { setGerando(false); }
      } },
    ]);
  }

  if (carregando) return <Loading />;

  const dadosCliente = unidade?.clientes;
  const numeroUc = unidade?.numero ?? numero ?? "Não informado";
  const concessionaria = unidade?.distribuidora ?? "Não informada";
  const enderecoContrato = dadosCliente?.endereco ?? "Endereço não informado";
  const nomeCliente = dadosCliente?.nome ?? cliente ?? "Cliente não informado";
  const usinaVinculada = unidade?.usinas?.nome ?? unidade?.usina_nome ?? (unidade?.usina_id ? "Usina vinculada" : "Não informada");
  const contratoAssinado = aceiteRegistrado || Boolean(contratoAssinadoUrl) || status === "VIGENTE";
  const somenteLeitura = contratoAssinado && !novoContrato;

  return (
    <Screen>
      {IS_GERADOR_APP ? <AppHeader variant="subpage" title="Contrato da unidade" subtitle="Dados contratuais" contextTitle={`UC ${numeroUc}`} contextSubtitle={nomeCliente} icon="document-text-outline" /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{somenteLeitura ? "CONTRATO ASSINADO" : novoContrato ? "NOVO CONTRATO" : "CONFIGURAÇÃO CONTRATUAL"}</Text>
          <Text style={styles.title}>Contrato da unidade</Text>
          <Text style={styles.subtitle}>{somenteLeitura ? "Documento preservado somente para consulta. Para alterar as condições, inicie um novo contrato." : "Revise os dados cadastrais que entrarão na minuta antes de gerar o documento."}</Text>
        </View>

        <Card style={styles.context}>
          <Ionicons name="flash-outline" size={21} color={Colors.primary} />
          <View style={styles.contextText}>
            <Text style={styles.contextLabel}>UNIDADE CONSUMIDORA</Text>
            <Text style={styles.contextValue}>UC {numeroUc} · {concessionaria}</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>RESUMO CADASTRAL</Text>
        <Card style={styles.partyCard}>
          <Text style={styles.partyIntro}>Estes dados vêm do cadastro vigente do consumidor e serão usados para preencher a minuta.</Text>
          <View style={styles.infoGrid}>
            <InfoContrato label="Cliente" value={nomeCliente} wide />
            <InfoContrato label="CPF (início)" value={primeirosDigitosDocumento(dadosCliente?.cpf)} />
            <InfoContrato label="Concessionária" value={concessionaria} />
            <InfoContrato label="Unidade consumidora" value={`UC ${numeroUc}`} />
            <InfoContrato label="Usina vinculada" value={usinaVinculada} />
            <InfoContrato label="Endereço do consumidor" value={enderecoContrato} wide />
          </View>
          <Text style={styles.editHint}>Para corrigir nome, CPF ou endereço, use Editar cliente antes de gerar a minuta.</Text>
        </Card>

        {somenteLeitura ? <>
        <Text style={styles.sectionTitle}>CONDIÇÕES DO CONTRATO</Text>
        <Card style={styles.partyCard}>
          <View style={styles.infoGrid}>
            <InfoContrato label="Número" value={numeroContrato || "Não informado"} wide />
            <InfoContrato label="Status" value={status} />
            <InfoContrato label="Desconto contratado" value={`${desconto || "0"}%`} />
            <InfoContrato label="Início da vigência" value={inicio || "Não informado"} />
            <InfoContrato label="Vencimento" value={fim || "Não informado"} />
            <InfoContrato label="Economia mensal estimada" value={`R$ ${economiaMensal || "0"}`} />
            <InfoContrato label="Economia anual estimada" value={`R$ ${economiaAnual || "0"}`} />
            <InfoContrato label="Locador" value={locadorNome || "Não informado"} wide />
          </View>
        </Card>
        <View style={styles.documentActions}>
          {contratoAssinadoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoAssinadoUrl)} style={styles.signedLink}><Ionicons name="document-text-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Abrir contrato assinado</Text></TouchableOpacity> : null}
          {!contratoAssinadoUrl && contratoGeradoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoGeradoUrl)} style={styles.documentLink}><Ionicons name="document-text-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Abrir contrato</Text></TouchableOpacity> : null}
          {assinaturaPendente ? <Button title="Validar assinaturas do PDF" disabled={gerando} onPress={confirmarAssinaturaExterna} /> : null}
          {!assinaturaPendente ? <Button title="Atualizar contrato e configuração" icon={<Ionicons name="sync-circle-outline" size={20} color={Colors.surface} />} onPress={() => router.push({ pathname: "/unidades/editar", params: { id, numero, clienteId, descontoPadrao: desconto, revisaoContrato: "1" } })} /> : null}
        </View>
        </> : <>
        <Text style={styles.sectionTitle}>DADOS DO LOCADOR E VIGÊNCIA</Text>
        <Card style={styles.formCard}>
          <InfoContrato label="Titularidade das UCs" value={titularidadeUcs === "CLIENTE" ? "Consumidor" : "Gerador"} wide />
          <FormField label="Nome ou razão social do locador *" value={locadorNome} onChangeText={setLocadorNome} placeholder="Ex.: Andrade Energy" />
          <FormField label="CPF/CNPJ do locador" value={locadorDocumento} onChangeText={setLocadorDocumento} placeholder="Para constar no contrato" />
          <FormField label="Endereço do locador" value={locadorEndereco} onChangeText={setLocadorEndereco} placeholder="Endereço completo" />
          <FormField label="Prazo do contrato (anos)" value={prazoAnos} onChangeText={(valor) => setPrazoAnos(valor.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="10" />
          <FormField label="Foro" value={foro} onChangeText={setForo} placeholder="Cidade/UF" />
        </Card>

        <Card>
          <View style={styles.infoGrid}>
            <InfoContrato
              label="Status do contrato"
              value={novoContrato ? "Nova revisão em rascunho" : "Rascunho"}
              wide
            />
          </View>
          <FormField label="Número do contrato *" value={numeroContrato} onChangeText={setNumeroContrato} placeholder="Ex.: AE-2026-001" />
          <FormField label="Termo de adesão" value={termoAdesao} onChangeText={setTermoAdesao} placeholder="Ex.: Termo assinado digitalmente" />
          <FormField label="Desconto contratado (%)" value={desconto} onChangeText={(valor) => setDesconto(valor.replace(/[^\d,.]/g, ""))} keyboardType="decimal-pad" placeholder="0" />
          <FormField label="Início da vigência" value={inicio} onChangeText={setInicio} keyboardType="numbers-and-punctuation" placeholder="DD/MM/AAAA" />
          <FormField label="Vencimento do contrato (automático)" value={fim} editable={false} placeholder="Calculado pelo prazo" />
          <FormField label="Economia mensal estimada pela proposta (R$)" value={economiaMensal} editable={false} placeholder="Calculada automaticamente" />
          <FormField label="Economia anual estimada pela proposta (R$)" value={economiaAnual} editable={false} placeholder="Calculada automaticamente" />
          <FormField label="Observações" value={observacoes} onChangeText={setObservacoes} placeholder="Informações adicionais para o contrato" multiline numberOfLines={3} textAlignVertical="top" />
          <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar rascunho"} icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.surface} />} onPress={salvar} />
        </Card>

        <View style={styles.documentActions}>
          <Button disabled={gerando} title={gerando ? "Gerando minuta..." : "Gerar minuta do contrato"} icon={<Ionicons name="document-text-outline" size={20} color={Colors.surface} />} onPress={gerarMinuta} />
          {contratoGeradoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoGeradoUrl)} style={styles.documentLink}><Ionicons name="download-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Abrir minuta gerada</Text></TouchableOpacity> : null}
          <Button disabled={gerando || !contratoGeradoUrl || dadosDaMinutaRevisada !== JSON.stringify(dadosParaSalvar())} title={gerando ? "Aguarde..." : "Enviar contrato e proposta"} onPress={enviarParaAnalise} />
          <Text style={styles.documentLinkText}>Gere e revise a minuta atual para habilitar o envio. Alterações nos campos exigem nova revisão.</Text>
          <Button disabled={importando} title={importando ? "Importando contrato..." : "Importar contrato assinado"} icon={<Ionicons name="attach-outline" size={20} color={Colors.surface} />} onPress={importarAssinado} />
          {contratoAssinadoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoAssinadoUrl)} style={styles.signedLink}><Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Contrato assinado vinculado à UC</Text></TouchableOpacity> : null}
          {assinaturaPendente ? <Button title="Validar assinaturas do PDF" disabled={gerando} onPress={confirmarAssinaturaExterna} /> : null}
        </View>
        </>}
      </ScrollView>
    </Screen>
  );
}

function InfoContrato({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <View style={[styles.infoContrato, wide && styles.infoContratoWide]}><Text style={styles.infoContratoLabel}>{label}</Text><Text style={styles.infoContratoValue}>{value}</Text></View>;
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
  partyCard: { marginBottom: Spacing.lg },
  formCard: { marginBottom: Spacing.lg },
  formHint: { marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 18 },
  partyIntro: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 18 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", padding: Spacing.sm, gap: Spacing.sm },
  infoContrato: { width: "48%", minHeight: 72, padding: Spacing.sm, borderRadius: 10, backgroundColor: Colors.background },
  infoContratoWide: { width: "100%" },
  infoContratoLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  infoContratoValue: { marginTop: 3, color: Colors.text, fontSize: Typography.small, fontWeight: "700", lineHeight: 19 },
  editHint: { margin: Spacing.md, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 18 },
  documentActions: { gap: Spacing.sm, marginTop: Spacing.lg },
  documentLink: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs },
  signedLink: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, borderRadius: 10, backgroundColor: Colors.primaryLight },
  documentLinkText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" },
});
