import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import FormField from "../../components/cadastro/FormField";
import { AppHeader, Button, Card, ElasticScrollView as ScrollView, Loading, Screen } from "../../components/ui";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { buscarContratoDaUnidade, buscarDadosIniciaisContrato, buscarResumoPropostaDaUnidade, gerarContratoDaUnidade, importarContratoAssinadoDaUnidade, prepararRevisaoDaUnidade, salvarContratoDaUnidade } from "../../services/contratos.service";
import { enviarContratoEConvite, validarAssinaturaExterna } from "../../services/contratos.service";
import { buscarUnidade } from "../../services/clientes.service";
import { buscarUsina } from "../../services/usinas.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

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
  const { id, numero, clienteId, cliente, descontoPadrao, revisao, revisaoToken, modoAssinado } = useLocalSearchParams<{
    id: string;
    numero: string;
    clienteId: string;
    cliente?: string;
    descontoPadrao?: string;
    revisao?: string;
    revisaoToken?: string;
    modoAssinado?: string;
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
  const [substituirRevisaoAssinada, setSubstituirRevisaoAssinada] = useState(false);
  const [assinaturaPendente, setAssinaturaPendente] = useState(false);
  const [dadosDaMinutaRevisada, setDadosDaMinutaRevisada] = useState<string>();
  const [titularidadeUcs, setTitularidadeUcs] = useState("GERADOR");

  useEffect(() => {
    setCarregando(true);
    setNovoContrato(String(revisao ?? "") === "1");
    setContratoAssinadoUrl(undefined);
    setContratoGeradoUrl(undefined);
    setSubstituirRevisaoAssinada(false);
    if (!id) {
      setCarregando(false);
      return;
    }

    Promise.allSettled([buscarContratoDaUnidade(id, true), buscarUnidade(id), buscarDadosIniciaisContrato(id), buscarResumoPropostaDaUnidade(id)])
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
          // No primeiro contrato ainda não existe rascunho para preencher o
          // formulário. A fonte correta é a configuração recém-salva da UC.
          setDesconto(valorParaCampo(unidadeCarregada?.desconto_percentual ?? descontoPadrao ?? 0));
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
        const revisaoAtual = String(revisao ?? "") === "1" || Boolean(contrato.dados_documento?.contrato_anterior_id);
        setNovoContrato(revisaoAtual);
        setContratoId(contrato.id);
        setAceiteRegistrado(Boolean(contrato.aceite_cliente_em));
        setAssinaturaPendente(Boolean(contrato.dados_documento?.assinatura_externa_pendente));
        const revisaoAssinadaEmRascunho = revisaoAtual
          && String(contrato.status).toUpperCase() === "RASCUNHO"
          && Boolean(contrato.contrato_assinado_url);
        setSubstituirRevisaoAssinada(revisaoAssinadaEmRascunho);
        const revisandoContratoAssinado = revisaoAtual
          && Boolean(contrato.aceite_cliente_em || contrato.contrato_assinado_url);
        setNumeroContrato(revisandoContratoAssinado ? `AE-${numero ?? unidadeCarregada?.numero ?? "UC"}-${new Date().getFullYear()}-R${Number(contrato.versao ?? 1) + 1}` : contrato.numero ?? "");
        setTermoAdesao(contrato.termo_adesao ?? "");
        setStatus((["ATIVO", "VIGENTE", "VENCIDO"].includes(String(contrato.status).toUpperCase()) ? String(contrato.status).toUpperCase() : "ATIVO") as StatusContrato);
        setDesconto(revisandoContratoAssinado
          ? valorParaCampo(unidadeCarregada?.desconto_percentual ?? descontoPadrao)
          : valorParaCampo(contrato.desconto ?? unidadeCarregada?.desconto_percentual ?? descontoPadrao ?? 0));
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
  }, [clienteId, id, revisao, revisaoToken]);

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
      ...(substituirRevisaoAssinada ? { nova_versao: true } : {}),
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
      // A versão retornada pelo servidor é a fonte de verdade: a tela pode ter
      // sido aberta sem o parâmetro `revisao`, mesmo havendo rascunho da revisão.
      const minutaDeRevisao = Boolean(contrato.dados_documento?.contrato_anterior_id);
      setNovoContrato(minutaDeRevisao);
      setContratoId(contrato.id);
      setDadosDaMinutaRevisada(JSON.stringify(dadosMinuta));
      setContratoGeradoUrl(contrato.contrato_gerado_url ?? undefined);
      setContratoAssinadoUrl(contrato.contrato_assinado_url ?? undefined);
      const minutaUrl = contrato.contrato_gerado_url;
      Alert.alert(
        "Minuta gerada",
        minutaDeRevisao
          ? "Revise as alterações antes de enviar ao cliente para aceite. O contrato anterior segue vigente até a concordância."
          : "Revise os dados e as cláusulas antes de colher as assinaturas.",
        [{
          text: "OK",
          onPress: minutaUrl ? async () => {
            try {
              await Linking.openURL(minutaUrl);
            } catch {
              Alert.alert("Não foi possível abrir", "Use o botão Abrir minuta gerada para tentar novamente.");
            }
          } : undefined,
        }],
      );
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
    Alert.alert(novoContrato ? "Enviar revisão para aceite" : "Enviar documentos", novoContrato
      ? "A nova minuta será enviada ao cliente para leitura e concordância no aplicativo, confirmada por código de e-mail. Não será solicitada outra assinatura. O contrato anterior permanece vigente até o aceite."
      : "Será enviada a última minuta gerada com a proposta desta UC. O convite de acesso só será criado se este cliente ainda não tiver recebido um. Se alterou os dados, gere e revise a minuta novamente antes de enviar.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Enviar", onPress: async () => {
        try {
          setGerando(true);
          const resultado = await enviarContratoEConvite(id);
          Alert.alert(
            resultado.emailEnviado ? "Documentos enviados" : "Envio não concluído",
            resultado.emailEnviado ? (novoContrato
              ? "A revisão foi enviada. O contrato anterior continua vigente até o cliente ler a nova minuta e concordar pelo aplicativo."
              : "O contrato foi enviado ao cliente. Agora é só aguardar a criação da conta e a assinatura. A UC continuará bloqueada até o aceite.") : "Não foi possível entregar o e-mail. Tente reenviar.",
            resultado.emailEnviado ? [{ text: "Ir para a Home", onPress: () => router.replace("/(tabs)" as any) }] : undefined,
          );
        } catch (erro: any) {
          Alert.alert("Não foi possível enviar", erro?.response?.data?.message || "Tente novamente.");
        } finally { setGerando(false); }
      } },
    ]);
  }

  async function importarAssinado() {
    if (!id) return;
    if ((novoContrato || modoAssinado === "1") && !validarDados()) return;
    try {
      const resultado = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
      if (resultado.canceled || !resultado.assets?.[0]) return;
      setImportando(true);
      if (novoContrato || modoAssinado === "1") await salvarContratoDaUnidade(id, dadosParaSalvar());
      const contrato = await importarContratoAssinadoDaUnidade(id, resultado.assets[0]);
      setContratoAssinadoUrl(contrato.contrato_assinado_url ?? undefined);
      setContratoId(contrato.id);
      setAssinaturaPendente(true);
      Alert.alert("PDF aguardando conferência", "Abra o documento e confira os dados e as assinaturas. A UC continuará pendente até você usar Validar assinaturas.");
    } catch (erro: any) {
      Alert.alert("Não foi possível importar", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setImportando(false);
    }
  }

  function confirmarAssinaturaExterna() {
    if (!contratoId || gerando) return;
    Alert.alert("Validar assinaturas", "Confirma que abriu o PDF e conferiu os dados desta UC e as assinaturas das partes? Depois da conferência, o cliente precisará aceitar o documento no app; ele não precisará assinar novamente.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Conferi e confirmo", onPress: async () => {
        try {
          setGerando(true);
          const resultado = await validarAssinaturaExterna(contratoId);
          setAssinaturaPendente(false);
          Alert.alert("Conferência registrada", resultado?.emailEnviado
            ? resultado?.acessoExistente
              ? "O cliente foi avisado por e-mail para conferir e aceitar o contrato no app. Até o aceite, continuam valendo as condições anteriores, se houver."
              : "O convite foi enviado. Depois de criar a conta, o cliente deverá conferir e aceitar o contrato no app."
            : `O documento foi conferido, mas o e-mail não foi entregue. ${resultado?.conviteErro ?? "Reenvie o convite pela área da UC."}`);
        } catch (erro: any) {
          Alert.alert("Não foi possível validar", erro?.response?.data?.message ?? "Tente novamente.");
        } finally { setGerando(false); }
      } },
    ]);
  }

  async function iniciarNovaVersao() {
    if (!id || gerando) return;
    try {
      setGerando(true);
      const rascunho = await prepararRevisaoDaUnidade(id);
      setContratoId(rascunho.id);
      setNumeroContrato(String(rascunho.numero ?? ""));
      setTermoAdesao(String(rascunho.termo_adesao ?? ""));
      setDesconto(valorParaCampo(unidade?.desconto_percentual ?? rascunho.desconto));
      setInicio(dataParaFormulario(rascunho.vigencia_inicio ?? rascunho.data_assinatura) || dataHoje());
      setFim(dataParaFormulario(rascunho.vigencia_fim));
      setEconomiaMensal(valorParaCampo(rascunho.economia_mensal_estimada));
      setEconomiaAnual(valorParaCampo(rascunho.economia_anual_estimada));
      setObservacoes(String(rascunho.observacoes ?? ""));
      setLocadorNome(String(rascunho.dados_documento?.locador_nome ?? locadorNome));
      setLocadorDocumento(String(rascunho.dados_documento?.locador_documento ?? locadorDocumento));
      setLocadorEndereco(String(rascunho.dados_documento?.locador_endereco ?? locadorEndereco));
      setPrazoAnos(String(rascunho.dados_documento?.prazo_anos ?? prazoAnos));
      setForo(String(rascunho.dados_documento?.foro ?? foro));
      setAceiteRegistrado(false);
      setAssinaturaPendente(false);
      setContratoAssinadoUrl(undefined);
      setContratoGeradoUrl(undefined);
      setDadosDaMinutaRevisada(undefined);
      setSubstituirRevisaoAssinada(false);
      setStatus("ATIVO");
      setNovoContrato(true);
    } catch (erro: any) {
      Alert.alert("Não foi possível iniciar a revisão", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  if (carregando) return <Loading />;

  const dadosCliente = unidade?.clientes;
  const numeroUc = unidade?.numero ?? numero ?? "Não informado";
  const concessionaria = unidade?.distribuidora ?? "Não informada";
  const enderecoContrato = dadosCliente?.endereco ?? "Endereço não informado";
  const nomeCliente = dadosCliente?.nome ?? cliente ?? "Cliente não informado";
  const usinaVinculada = unidade?.usinas?.nome ?? unidade?.usina_nome ?? (unidade?.usina_id ? "Usina vinculada" : "Não informada");
  const contratoAssinado = aceiteRegistrado || Boolean(contratoAssinadoUrl) || status === "VIGENTE";
  // Um PDF já assinado em rascunho de revisão não é uma minuta regenerável.
  // Ele só pode ser trocado antes da conferência ou validado pelo gerador.
  const somenteLeitura = Boolean(contratoAssinadoUrl) || (contratoAssinado && !novoContrato);

  return (
    <Screen>
      {IS_GERADOR_APP ? <AppHeader variant="subpage" title="Contrato da unidade" subtitle="Dados contratuais" contextTitle={`UC ${numeroUc}`} contextSubtitle={nomeCliente} icon="document-text-outline" /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>{somenteLeitura ? "CONTRATO ASSINADO" : novoContrato ? "REVISÃO DO CONTRATO" : modoAssinado === "1" ? "CONTRATO JÁ ASSINADO" : "CONFIGURAÇÃO CONTRATUAL"}</Text>
          <Text style={styles.title}>Contrato da unidade</Text>
          <Text style={styles.subtitle}>{somenteLeitura ? "Documento preservado somente para consulta. Para alterar as condições, inicie uma revisão." : modoAssinado === "1" ? "Confira os dados da UC e anexe o PDF já assinado. A UC só será liberada depois da conferência manual do documento." : "Revise os dados cadastrais que entrarão na minuta antes de gerar o documento."}</Text>
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

        {!somenteLeitura ? <Card style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>ORDEM PARA ENVIAR O CONTRATO</Text>
          <Text style={styles.stepText}>1. Preencha e salve a configuração contratual.</Text>
          <Text style={styles.stepText}>2. Gere a minuta e abra o documento para revisar.</Text>
          <Text style={styles.stepText}>3. Somente depois da revisão, envie ao cliente para {novoContrato ? "aceite das alterações" : "assinatura"}.</Text>
          <Text style={styles.stepsWarning}>O envio permanece bloqueado enquanto a minuta atual não for gerada e revisada.</Text>
        </Card> : null}
        <View style={styles.documentActions}>
          {contratoAssinadoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoAssinadoUrl)} style={styles.signedLink}><Ionicons name="document-text-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Abrir contrato assinado</Text></TouchableOpacity> : null}
          {assinaturaPendente ? <TouchableOpacity accessibilityRole="button" activeOpacity={0.84} disabled={importando} onPress={importarAssinado} style={styles.uploadSignedButton}><Ionicons name="swap-horizontal-outline" size={20} color={Colors.primary} /><Text style={styles.uploadSignedButtonText}>{importando ? "Trocando documento..." : "Trocar documento assinado"}</Text></TouchableOpacity> : null}
          {!contratoAssinadoUrl && contratoGeradoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoGeradoUrl)} style={styles.documentLink}><Ionicons name="document-text-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Abrir contrato</Text></TouchableOpacity> : null}
          {assinaturaPendente ? <Button title="Validar assinaturas do PDF" disabled={gerando} onPress={confirmarAssinaturaExterna} /> : null}
          {!assinaturaPendente ? <Button title={gerando ? "Preparando revisão..." : "Criar nova versão do contrato"} disabled={gerando} icon={<Ionicons name="sync-circle-outline" size={20} color={Colors.surface} />} onPress={iniciarNovaVersao} /> : null}
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
          {modoAssinado !== "1" ? <Button disabled={salvando} title={salvando ? "Salvando..." : "Salvar rascunho"} icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.surface} />} onPress={salvar} /> : null}
        </Card>

        <View style={styles.documentActions}>
          {novoContrato ? <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: "/unidades/editar", params: { id, numero: numeroUc, clienteId: unidade?.cliente_id ?? clienteId, descontoPadrao: desconto, revisaoContrato: "1" } })} style={styles.documentLink}><Ionicons name="options-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Editar configuração da UC</Text></TouchableOpacity> : null}
          {modoAssinado !== "1" ? <Button disabled={gerando} title={gerando ? "Gerando minuta..." : "Gerar e revisar a minuta"} icon={<Ionicons name="document-text-outline" size={20} color={Colors.surface} />} onPress={gerarMinuta} /> : null}
          {contratoGeradoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoGeradoUrl)} style={styles.documentLink}><Ionicons name="download-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Abrir minuta gerada</Text></TouchableOpacity> : null}
          {modoAssinado !== "1" ? <><Button disabled={gerando || !contratoGeradoUrl || dadosDaMinutaRevisada !== JSON.stringify(dadosParaSalvar())} title={gerando ? "Aguarde..." : novoContrato ? "Enviar revisão para aceite" : "Enviar para assinatura"} onPress={enviarParaAnalise} /><Text style={styles.documentLinkText}>Gere e revise a minuta atual para habilitar o envio. Alterações nos campos exigem nova revisão.</Text></> : null}
          {modoAssinado === "1" && (!contratoAssinadoUrl || assinaturaPendente) ? <TouchableOpacity accessibilityRole="button" activeOpacity={0.84} disabled={importando} onPress={importarAssinado} style={styles.uploadSignedButton}>
            <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary} />
            <Text style={styles.uploadSignedButtonText}>{importando ? (assinaturaPendente ? "Trocando documento..." : "Enviando contrato...") : (assinaturaPendente ? "Trocar documento assinado" : "Enviar contrato assinado (PDF)")}</Text>
          </TouchableOpacity> : null}
          {contratoAssinadoUrl ? <TouchableOpacity onPress={() => Linking.openURL(contratoAssinadoUrl)} style={styles.signedLink}><Ionicons name="checkmark-circle-outline" size={18} color={Colors.primary} /><Text style={styles.documentLinkText}>Contrato assinado vinculado à UC</Text></TouchableOpacity> : null}
          {modoAssinado === "1" && assinaturaPendente ? <Button title="Validar assinaturas do PDF" disabled={gerando} onPress={confirmarAssinaturaExterna} /> : null}
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
  stepsCard: { marginBottom: Spacing.lg, borderWidth: 1, borderColor: "#F3C94F", backgroundColor: "#FFF9E8" },
  stepsTitle: { marginBottom: Spacing.sm, color: Colors.text, fontSize: Typography.small, fontWeight: "900", letterSpacing: 0.6 },
  stepText: { marginTop: 4, color: Colors.text, fontSize: Typography.caption, fontWeight: "700", lineHeight: 19 },
  stepsWarning: { marginTop: Spacing.sm, color: "#92400E", fontSize: Typography.small, fontWeight: "800", lineHeight: 18 },
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
  documentLink: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  signedLink: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.lg, backgroundColor: Colors.primaryLight },
  uploadSignedButton: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, borderWidth: 2, borderColor: Colors.primary, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  uploadSignedButtonText: { color: Colors.primary, fontSize: Typography.body, fontWeight: "800" },
  documentLinkText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" },
});
