import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import {
  Alert,
  RefreshControl,
  Linking,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRef, useState } from "react";
import { router } from "expo-router";

import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Loading,
  Screen,
} from "../../components/ui";
import { useContrato } from "../../hooks/useContrato";
import { useDashboard } from "../../hooks/useDashboard";
import { useAuth } from "../../contexts/AuthContext";
import ClienteHeader from "../../components/cliente/ClienteHeader";
import {
  cancelarContrato,
  baixarPropostaDaUnidade,
  importarContratoAssinadoPeloCliente,
  registrarAceiteEletronico,
  solicitarCodigoAssinatura,
} from "../../services/contratos.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { useQueryClient } from "@tanstack/react-query";
import SignaturePad from "../../components/cliente/SignaturePad";
import { IS_GERADOR_APP } from "../../config/appVariant";
import ContratosClientes from "../contratos";

function formatarData(data?: string) {
  if (!data) return "Não informado";

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return data;

  return valor.toLocaleDateString("pt-BR");
}

function normalizarStatus(status?: string) {
  return (status ?? "Ativo").trim().toUpperCase();
}

export default function Contrato() {
  return IS_GERADOR_APP ? <ContratosClientes /> : <ContratoConsumidor />;
}

function ContratoConsumidor() {
  const { data, isLoading, error, refetch: recarregarContrato } = useContrato();
  const { data: dashboard, refetch: recarregarDashboard } = useDashboard();
  const { unidadeSelecionada } = useAuth();
  const queryClient = useQueryClient();
  const [atualizando, setAtualizando] = useState(false);
  const [registrandoAceite, setRegistrandoAceite] = useState(false);
  const [enviandoAssinado, setEnviandoAssinado] = useState(false);
  const [modalAssinatura, setModalAssinatura] = useState(false);
  const [codigoAssinatura, setCodigoAssinatura] = useState("");
  const [tracosAssinatura, setTracosAssinatura] = useState<string[]>([]);
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [emailCodigo, setEmailCodigo] = useState("");
  const [concordouRevisao, setConcordouRevisao] = useState(false);
  const [abrindoProposta, setAbrindoProposta] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const assinaturaY = useRef(0);

  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await Promise.all([recarregarContrato(), recarregarDashboard()]);
    } finally {
      setAtualizando(false);
    }
  }

  if (isLoading) return <Loading />;

  if (error || !data) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <EmptyState
            icon="document-text-outline"
            title="Contrato não encontrado"
            subtitle="Não localizamos um contrato vinculado à sua conta. Fale com o suporte se precisar de ajuda."
          />
        </View>
      </Screen>
    );
  }

  const status = normalizarStatus(data.status);
  const ativo = ["ATIVO", "VIGENTE"].includes(status);
  const vencido =
    status === "VENCIDO" ||
    Boolean(
      data.vigencia_fim &&
      new Date(`${data.vigencia_fim}T23:59:59`).getTime() < Date.now(),
    );
  const economiaMensal = Number(
    dashboard?.economiaMes ?? data.economia_mensal_estimada ?? 0,
  );
  const economiaAnual = Number(
    data.economia_anual_estimada ?? economiaMensal * 12,
  );
  const arquivoContrato =
    data.contrato_assinado_url ?? data.contrato_gerado_url ?? data.arquivo_pdf;
  const aceiteExternoPendente = Boolean(data.dados_documento?.aceite_cliente_exigido && data.dados_documento?.assinatura_externa_validada_em && !data.aceite_cliente_em);
  const revisaoPendente = Boolean(!data.aceite_cliente_em && (aceiteExternoPendente || (data.revisao_anterior?.id && !data.contrato_assinado_url)));
  const configuracaoAnterior = data.revisao_anterior?.configuracao_uc_snapshot ?? {};
  const configuracaoRevisada = data.configuracao_uc_snapshot ?? {};
  const aceiteRegistrado = Boolean(data.aceite_cliente_em);
  const pdfAssinadoEnviado = Boolean(data.contrato_assinado_url);
  const assinaturaExternaValidada = Boolean(
    pdfAssinadoEnviado && data.dados_documento?.assinatura_externa_validada_em,
  );
  const pdfAssinadoPendente = Boolean(
    pdfAssinadoEnviado &&
    data.dados_documento?.assinatura_externa_pendente === true &&
    !data.dados_documento?.assinatura_externa_validada_em,
  );
  const assinaturaInicialPendente = status === "RASCUNHO" && !aceiteRegistrado && !pdfAssinadoEnviado;
  const statusVisivel = assinaturaInicialPendente ? "Aguardando assinatura" : data.status || "Ativo";
  function irParaAssinatura() {
    scrollRef.current?.scrollTo({ y: Math.max(0, assinaturaY.current - 16), animated: true });
  }
  async function abrirProposta() {
    if (!unidadeSelecionada?.id) return Alert.alert("Selecione a unidade", "Escolha a UC antes de abrir sua proposta.");
    try {
      setAbrindoProposta(true);
      const uri = await baixarPropostaDaUnidade(unidadeSelecionada.id);
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, flags: 1, type: "application/pdf" });
      } else {
        await Linking.openURL(uri);
      }
    }
    catch (erro: any) { Alert.alert("Proposta indisponível", erro?.response?.data?.message ?? "Não foi possível gerar a proposta desta UC."); }
    finally { setAbrindoProposta(false); }
  }

  async function abrirContrato() {
    if (!arquivoContrato) {
      Alert.alert("Contrato", "O documento em PDF ainda não está disponível.");
      return;
    }

    try {
      const podeAbrir = await Linking.canOpenURL(arquivoContrato);
      if (!podeAbrir) throw new Error("URL não suportada");
      await Linking.openURL(arquivoContrato);
    } catch {
      Alert.alert(
        "Não foi possível abrir o contrato",
        "Confira sua conexão ou fale com o suporte.",
      );
    }
  }

  async function abrirAssinatura() {
    setEnviandoCodigo(true);
    try {
      const resposta = await solicitarCodigoAssinatura(data.id);
      setEmailCodigo(resposta.emailMascarado ?? "seu e-mail");
      setCodigoAssinatura("");
      setTracosAssinatura([]);
      setConcordouRevisao(false);
      setModalAssinatura(true);
    } catch (erro: any) {
      Alert.alert("Código não enviado", erro?.response?.data?.message ?? "Tente novamente.");
    } finally {
      setEnviandoCodigo(false);
    }
  }

  async function confirmarAceite() {
    if (codigoAssinatura.length !== 6) return Alert.alert("Código incompleto", "Informe os seis dígitos enviados ao e-mail.");
    if (revisaoPendente && !concordouRevisao) return Alert.alert("Confirme o aceite", "Leia o documento e confirme que concorda com suas condições.");
    if (!revisaoPendente && !tracosAssinatura.length) return Alert.alert("Assinatura necessária", "Faça sua assinatura no campo indicado.");
    setRegistrandoAceite(true);
    try {
      await registrarAceiteEletronico(data.id, { codigo: codigoAssinatura, assinatura: tracosAssinatura, aceiteRevisao: revisaoPendente });
      setModalAssinatura(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contrato"] }),
        queryClient.invalidateQueries({ queryKey: ["contratos-acesso"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      Alert.alert(
        revisaoPendente ? "Aceite registrado" : "Contrato assinado com sucesso",
        revisaoPendente ? "Seu aceite do documento foi registrado. Não foi necessário assinar novamente." : "Sua assinatura foi registrada e esta unidade já está liberada para acesso.",
        [
          {
            text: "Acessar minha unidade",
            // A UC já está selecionada quando o consumidor entra neste fluxo.
            // Substitui a rota para impedir o retorno ao bloqueio contratual.
            onPress: () => router.replace("/"),
          },
        ],
        { cancelable: false },
      );
    } catch (erro: any) {
      Alert.alert("Não foi possível assinar", erro?.response?.data?.message ?? "Tente novamente.");
    } finally {
      setRegistrandoAceite(false);
    }
  }

  async function assinarComGovBr() {
    if (!arquivoContrato) {
      Alert.alert(
        "PDF indisponível",
        "O gerador precisa gerar a minuta antes da assinatura.",
      );
      return;
    }
    await abrirContrato();
    setTimeout(() => {
      Alert.alert(
        "Assinatura gratuita",
        "Com o PDF aberto, salve-o e acesse o Assinador GOV.BR. Você precisará de uma conta GOV.BR nível prata ou ouro. Depois, envie aqui o PDF assinado.",
        [
          { text: "Agora não", style: "cancel" },
          {
            text: "Abrir GOV.BR",
            onPress: () => Linking.openURL("https://assinador.iti.br/"),
          },
        ],
      );
    }, 350);
  }

  async function enviarPdfAssinado() {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (resultado.canceled || !resultado.assets?.[0]) return;
    setEnviandoAssinado(true);
    try {
      await importarContratoAssinadoPeloCliente(data.id, resultado.assets[0]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["contrato"] }),
        queryClient.invalidateQueries({ queryKey: ["contratos-acesso"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      Alert.alert(
        pdfAssinadoPendente ? "PDF substituído" : "Contrato enviado",
        "O PDF ficou aguardando conferência do gerador. Esta unidade somente será ativada depois da validação manual.",
      );
    } catch (erro: any) {
      Alert.alert(
        "Não foi possível enviar",
        erro?.response?.data?.message ?? "Tente novamente.",
      );
    } finally {
      setEnviandoAssinado(false);
    }
  }

  function solicitarCancelamento() {
    Alert.alert(
      "Solicitar cancelamento",
      "O gerador e os colaboradores responsáveis serão avisados. O contrato continuará vigente até a análise da solicitação.",
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Enviar solicitação",
          style: "destructive",
          onPress: async () => {
            try {
              const resultado = await cancelarContrato(data.id);
              await queryClient.invalidateQueries({ queryKey: ["contrato"] });
              Alert.alert("Solicitação enviada", resultado?.message ?? "O gerador e a equipe responsável foram avisados.");
            } catch (erro: any) {
              Alert.alert(
                "Não foi possível cancelar",
                erro?.response?.data?.message ??
                  erro?.message ??
                  "Tente novamente.",
              );
            }
          },
        },
      ],
    );
  }

  function solicitarRenovacao() {
    const assunto = encodeURIComponent(
      `Renovação antecipada do contrato ${data.numero ?? data.id}`,
    );
    const corpo = encodeURIComponent(
      `Olá, gostaria de antecipar a renovação do contrato ${data.numero ?? data.id}, vinculado à UC ${dashboard?.uc ?? unidadeSelecionada?.numero ?? ""}. Aguardo as novas condições para confirmar.`,
    );
    void Linking.openURL(
      `mailto:contato@andradese.com.br?subject=${assunto}&body=${corpo}`,
    );
  }

  return (
    <Screen>
      <ClienteHeader
        cliente={dashboard?.cliente ?? "Cliente"}
        uc={dashboard?.uc ?? unidadeSelecionada?.numero ?? ""}
        distribuidora={
          dashboard?.distribuidora ??
          unidadeSelecionada?.distribuidora ??
          "Concessionária"
        }
        fullBleed
      />
      <ScrollView
        ref={scrollRef}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizarPagina}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>DOCUMENTOS</Text>
          <Text style={styles.title}>Meu contrato</Text>
          <Text style={styles.subtitle}>
            Resumo do seu plano de energia e condições de adesão.
          </Text>
        </View>

        <Pressable accessibilityRole={assinaturaInicialPendente ? "button" : undefined} accessibilityLabel={assinaturaInicialPendente ? "Meu contrato, aguardando assinatura. Ir para assinatura" : undefined} disabled={!assinaturaInicialPendente} onPress={irParaAssinatura} style={styles.hero}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color={Colors.surface}
              />
            </View>
            <Badge
              label={statusVisivel}
              variant={ativo ? "success" : "warning"}
            />
          </View>

          <Text style={styles.heroLabel}>Número do contrato</Text>
          <Text style={styles.heroValue}>{data.numero || "Não informado"}</Text>
          <Text style={styles.heroHint}>
            {assinaturaInicialPendente ? "Toque para ir à assinatura" : "Andrade Energy · Energia por assinatura"}
          </Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Resumo do contrato</Text>
        <TouchableOpacity activeOpacity={0.84} disabled={abrindoProposta} onPress={() => void abrirProposta()} style={styles.proposalLink}><Ionicons name="document-attach-outline" size={21} color={Colors.primary} /><View style={{ flex: 1 }}><Text style={styles.proposalTitle}>Proposta comercial da UC</Text><Text style={styles.proposalSubtitle}>PDF com desconto e projeção de economia desta unidade.</Text></View><Ionicons name="download-outline" size={20} color={Colors.primary} /></TouchableOpacity>

        <Card>
          <InfoRow
            icon="pricetag-outline"
            label="Desconto contratado"
            value={`${Number(data.desconto ?? 0).toLocaleString("pt-BR")}%`}
          />
          <Divider />
          <InfoRow
            icon="create-outline"
            label="Termo de adesão"
            value={data.termo_adesao ?? data.numero ?? "Assinado digitalmente"}
          />
          <Divider />
          <InfoRow
            icon="flash-outline"
            label="Unidades consumidoras"
            value={String(
              data.unidades_consumidoras ?? (unidadeSelecionada ? 1 : 0),
            )}
          />
        </Card>

        <Text style={styles.sectionTitle}>Economia estimada</Text>
        <Card>
          <View style={styles.economyGrid}>
            <View style={styles.economyItem}>
              <Text style={styles.infoLabel}>Mensal</Text>
              <Text
                adjustsFontSizeToFit
                allowFontScaling={false}
                minimumFontScale={0.5}
                numberOfLines={1}
                style={styles.economyValue}
              >
                {economiaMensal.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </View>
            <View style={styles.economyItem}>
              <Text style={styles.infoLabel}>Anual</Text>
              <Text
                adjustsFontSizeToFit
                allowFontScaling={false}
                minimumFontScale={0.5}
                numberOfLines={1}
                style={styles.economyValue}
              >
                {economiaAnual.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Vigência</Text>

        <Card>
          <View style={styles.period}>
            <View style={styles.periodItem}>
              <Text style={styles.periodLabel}>INÍCIO</Text>
              <Text style={styles.periodValue}>
                {formatarData(data.vigencia_inicio)}
              </Text>
            </View>

            <View style={styles.periodLine}>
              <View style={styles.periodDot} />
              <View style={styles.periodTrack} />
              <View style={styles.periodDot} />
            </View>

            <View style={[styles.periodItem, styles.periodItemEnd]}>
              <Text style={styles.periodLabel}>TÉRMINO</Text>
              <Text style={styles.periodValue}>
                {formatarData(data.vigencia_fim)}
              </Text>
            </View>
          </View>
        </Card>

        {data.revisao_anterior?.id && revisaoPendente ? <View style={styles.revisionNotice}>
          <Ionicons name="document-text-outline" size={20} color="#9A6700" />
          <Text style={styles.revisionNoticeText}>O gerador enviou uma revisão do contrato {data.revisao_anterior?.numero ?? "anterior"}. Confira a nova minuta e as condições abaixo antes de concordar. O documento assinado anteriormente permanece preservado.</Text>
        </View> : null}
        {data.revisao_anterior?.id && revisaoPendente ? <Card>
          <Text style={styles.sectionTitle}>Condições alteradas</Text>
          {([
            ["Desconto", configuracaoAnterior.desconto_percentual ?? data.revisao_anterior?.desconto, configuracaoRevisada.desconto_percentual ?? data.desconto, "%"],
            ["Percentual de injeção/alocação", configuracaoAnterior.percentual_rateio, configuracaoRevisada.percentual_rateio, "%"],
            ["Modalidade", configuracaoAnterior.modalidade_faturamento, configuracaoRevisada.modalidade_faturamento, ""],
          ] as Array<[string, unknown, unknown, string]>).filter(([, antes, depois]) => String(antes ?? "") !== String(depois ?? "")).map(([rotulo, antes, depois, unidade]) => (
            <Text key={rotulo} style={styles.revisionNoticeText}>{rotulo}: {String(antes ?? "Não informado")}{unidade} → {String(depois ?? "Não informado")}{unidade}</Text>
          ))}
          {String(configuracaoAnterior.usina_id ?? "") !== String(configuracaoRevisada.usina_id ?? "") ? <Text style={styles.revisionNoticeText}>Usina vinculada alterada. Confira os detalhes na minuta.</Text> : null}
          <Text style={styles.revisionNoticeText}>Confira todas as cláusulas e valores na nova minuta em PDF antes de aceitar.</Text>
        </Card> : null}
        <View onLayout={(event) => { assinaturaY.current = event.nativeEvent.layout.y; }}>
        <Text style={styles.sectionTitle}>{revisaoPendente ? "Aceite da revisão" : "Assinatura"}</Text>
        {data.revisao_configuracao_pendente ? <View style={styles.revisionNotice}><Ionicons name="alert-circle-outline" size={20} color="#9A6700" /><Text style={styles.revisionNoticeText}>A configuração desta UC foi alterada. O gerador precisa emitir uma nova versão para sua assinatura.</Text></View> : null}
        <Card>
          <InfoRow
            icon={
              aceiteRegistrado || (assinaturaExternaValidada && !revisaoPendente)
                ? "checkmark-circle-outline"
                : "shield-checkmark-outline"
            }
            label={revisaoPendente ? "Aceite da revisão" : assinaturaExternaValidada ? "Assinatura externa" : "Aceite no aplicativo"}
            value={
              revisaoPendente
                ? "Pendente"
                : assinaturaExternaValidada
                ? `Conferida pelo gerador em ${formatarData(data.dados_documento.assinatura_externa_validada_em)}`
                : aceiteRegistrado
                ? `Registrado em ${formatarData(data.aceite_cliente_em)}`
                : "Pendente"
            }
          />
          {!aceiteRegistrado && !assinaturaExternaValidada ? <>
            <Divider />
            <InfoRow
              icon={pdfAssinadoEnviado ? "document-attach-outline" : "document-outline"}
              label="Assinatura digital"
              value={
                pdfAssinadoEnviado
                  ? data.dados_documento?.assinatura_externa_validada_em ? "Conferência do gerador registrada" : "Aguardando conferência do gerador"
                  : "Opcional pelo GOV.BR"
              }
            />
          </> : null}
        </Card>

        <View style={styles.signatureActions}>
          <Button
            disabled={!arquivoContrato}
            icon={<Ionicons name="download-outline" size={20} color={Colors.surface} />}
            onPress={abrirContrato}
            title={arquivoContrato
              ? pdfAssinadoEnviado ? "Abrir contrato assinado" : "Abrir minuta do contrato"
              : "PDF ainda não disponível"}
          />
          {(!pdfAssinadoEnviado || aceiteExternoPendente) && !aceiteRegistrado ? <>
            <Button
              disabled={registrandoAceite || !arquivoContrato}
              icon={
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={Colors.surface}
                />
              }
              onPress={() => void abrirAssinatura()}
              title={
                registrandoAceite || enviandoCodigo
                  ? "Preparando confirmação..."
                  : aceiteExternoPendente ? "Aceitar contrato assinado" : revisaoPendente ? "Concordar com as alterações" : "Assinar contrato no app"
              }
            />
            {!revisaoPendente ? <TouchableOpacity
              activeOpacity={0.85}
              onPress={assinarComGovBr}
              style={styles.govButton}
            >
              <Ionicons name="open-outline" size={20} color={Colors.primary} />
              <Text style={styles.govButtonText}>
                Assinar gratuitamente no GOV.BR
              </Text>
            </TouchableOpacity> : null}
            {!revisaoPendente ? <TouchableOpacity
              activeOpacity={0.85}
              disabled={enviandoAssinado}
              onPress={enviarPdfAssinado}
              style={styles.uploadButton}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.govButtonText}>
                {enviandoAssinado ? "Enviando PDF..." : "Enviar PDF assinado"}
              </Text>
            </TouchableOpacity> : null}
          </> : null}
          {pdfAssinadoPendente && !aceiteRegistrado ? <TouchableOpacity
            activeOpacity={0.85}
            disabled={enviandoAssinado}
            onPress={enviarPdfAssinado}
            style={styles.uploadButton}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color={Colors.primary} />
            <Text style={styles.govButtonText}>
              {enviandoAssinado ? "Trocando documento..." : "Trocar documento assinado"}
            </Text>
          </TouchableOpacity> : null}
        </View>
        </View>

        {ativo && !revisaoPendente ? <TouchableOpacity
          activeOpacity={0.85}
          onPress={solicitarRenovacao}
          style={styles.renewButton}
        >
          <Ionicons
            name="refresh-circle-outline"
            size={21}
            color={Colors.primary}
          />
          <View style={styles.renewCopy}>
            <Text style={styles.renewTitle}>Antecipar renovação</Text>
            <Text style={styles.renewText}>
              Solicite as novas condições antes do término e confirme antes de
              renovar.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </TouchableOpacity> : null}

        {!revisaoPendente ? <TouchableOpacity
          activeOpacity={0.85}
          onPress={solicitarCancelamento}
          style={styles.cancelButton}
        >
          <Ionicons
            name="close-circle-outline"
            size={20}
            color={vencido ? Colors.danger : Colors.subtitle}
          />
          <Text style={styles.cancelButtonText}>Cancelar contrato</Text>
        </TouchableOpacity> : null}

        <View style={styles.securityNote}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color={Colors.primary}
          />
          <Text style={styles.securityText}>
            Documento vinculado à sua unidade consumidora.
          </Text>
        </View>
      </ScrollView>
      <Modal animationType="slide" transparent visible={modalAssinatura} onRequestClose={() => !registrandoAceite && setModalAssinatura(false)}>
        <Pressable style={styles.signatureBackdrop} onPress={() => !registrandoAceite && setModalAssinatura(false)}>
          <Pressable style={styles.signatureSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.signatureHandle} />
            <Text style={styles.signatureTitle}>{aceiteExternoPendente ? "Aceitar contrato assinado" : revisaoPendente ? "Concordar com a revisão" : "Assinar contrato"}</Text>
            <Text style={styles.signatureSubtitle}>{aceiteExternoPendente ? `Confira o PDF já assinado. Ao confirmar com o código enviado para ${emailCodigo}, você aceita as condições sem assinar novamente.` : revisaoPendente ? `Ao confirmar, você concorda com a nova minuta exibida nesta tela. Informe o código enviado para ${emailCodigo}.` : `Confira a minuta, assine no campo abaixo e confirme com o código enviado para ${emailCodigo}.`}</Text>
            {revisaoPendente ? <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: concordouRevisao }} onPress={() => setConcordouRevisao((atual) => !atual)} style={styles.govButton}>
              <Ionicons name={concordouRevisao ? "checkbox-outline" : "square-outline"} size={22} color={Colors.primary} />
              <Text style={styles.govButtonText}>Li a nova minuta e concordo com as alterações.</Text>
            </TouchableOpacity> : null}
            {!revisaoPendente ? <SignaturePad value={tracosAssinatura} onChange={setTracosAssinatura} /> : null}
            <Text style={styles.codeLabel}>Código de confirmação</Text>
            <TextInput
              autoComplete="one-time-code"
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(valor) => setCodigoAssinatura(valor.replace(/\D/g, ""))}
              placeholder="000000"
              placeholderTextColor={Colors.subtitle}
              style={styles.codeInput}
              value={codigoAssinatura}
            />
            <TouchableOpacity disabled={enviandoCodigo} onPress={() => void abrirAssinatura()} style={styles.resendCode}>
              <Text style={styles.resendCodeText}>{enviandoCodigo ? "Reenviando..." : "Reenviar código"}</Text>
            </TouchableOpacity>
            <Button disabled={registrandoAceite || codigoAssinatura.length !== 6 || (revisaoPendente ? !concordouRevisao : !tracosAssinatura.length)} title={registrandoAceite ? "Registrando aceite..." : revisaoPendente ? "Confirmar concordância" : "Confirmar e assinar"} onPress={() => void confirmarAceite()} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  heading: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: Typography.small,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  title: {
    marginTop: Spacing.xs,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: Spacing.xs,
    color: Colors.subtitle,
    fontSize: Typography.caption,
    lineHeight: 20,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryDark,
  },
  heroBackground: {
    borderRadius: Radius.xl,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 42, 31, 0.34)",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  heroLabel: {
    marginTop: Spacing.lg,
    color: "#CBD5E1",
    fontSize: Typography.caption,
  },
  heroValue: {
    marginTop: 4,
    color: Colors.surface,
    fontSize: Typography.section,
    fontWeight: "800",
  },
  heroHint: {
    marginTop: Spacing.sm,
    color: "#CBD5E1",
    fontSize: Typography.small,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    color: Colors.subtitle,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  proposalLink: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: "#E9F5EF" },
  proposalTitle: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
  proposalSubtitle: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 18 },
  infoRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
  },
  infoContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  infoLabel: {
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  infoValue: {
    marginTop: 3,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "700",
  },
  period: {
    flexDirection: "row",
    alignItems: "center",
  },
  periodItem: {
    flex: 1,
  },
  periodItemEnd: {
    alignItems: "flex-end",
  },
  periodLabel: {
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  periodValue: {
    marginTop: 5,
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  periodLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.sm,
  },
  periodDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
  },
  periodTrack: {
    flex: 1,
    height: 2,
    backgroundColor: "#D1FAE5",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  renewButton: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
  },
  renewCopy: { flex: 1 },
  renewTitle: {
    color: Colors.primary,
    fontSize: Typography.body,
    fontWeight: "800",
  },
  renewText: {
    marginTop: 2,
    color: Colors.subtitle,
    fontSize: Typography.small,
    lineHeight: 16,
  },
  cancelButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: Spacing.sm,
    borderColor: Colors.danger,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  cancelButtonText: {
    marginLeft: Spacing.xs,
    color: Colors.danger,
    fontSize: Typography.body,
    fontWeight: "700",
  },
  govButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: Radius.lg,
  },
  uploadButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderColor: Colors.primary,
    borderWidth: 2,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  govButtonText: {
    marginLeft: Spacing.xs,
    color: Colors.primary,
    fontSize: Typography.body,
    fontWeight: "700",
  },
  signatureActions: {
    gap: Spacing.sm,
  },
  economyGrid: { flexDirection: "row", gap: Spacing.sm },
  economyItem: { flex: 1, minWidth: 0 },
  economyValue: {
    marginTop: 5,
    color: Colors.primary,
    width: "100%",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    flexShrink: 1,
  },
  securityText: {
    marginLeft: Spacing.xs,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  signatureBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(3, 18, 13, 0.58)" },
  revisionNotice: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: "#FFF4CE" },
  revisionNoticeText: { flex: 1, color: "#6B4F00", fontSize: Typography.caption, lineHeight: 18, fontWeight: "600" },
  signatureSheet: { maxHeight: "94%", padding: Spacing.lg, paddingBottom: 30, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: Colors.background },
  signatureHandle: { width: 42, height: 4, alignSelf: "center", marginBottom: Spacing.md, borderRadius: 2, backgroundColor: Colors.border },
  signatureTitle: { color: Colors.text, fontSize: Typography.section, fontWeight: "800" },
  signatureSubtitle: { marginTop: 5, marginBottom: Spacing.md, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 19 },
  codeLabel: { marginTop: Spacing.xs, marginBottom: 6, color: Colors.text, fontSize: Typography.caption, fontWeight: "700" },
  codeInput: { height: 54, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface, color: Colors.text, fontSize: 24, fontWeight: "800", letterSpacing: 8, textAlign: "center" },
  resendCode: { alignSelf: "flex-end", paddingVertical: Spacing.sm },
  resendCodeText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "700" },
});
