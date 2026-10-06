import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../contexts/AuthContext";
import { isPreviewEnvironment } from "../config/environment";
import { IS_GERADOR_APP } from "../config/appVariant";
import { answerInConversation, asksLatestInvoiceAmount, LocalReply, LocalTopic, normalizeAssistantQuery } from "../services/local-assistant";
import { buscarFatura, listarFaturas } from "../services/faturas.service";
import { asksLatestInvoiceDocument, invoiceDocumentChoices, latestInvoiceAmountReply, asksOverdueInvoices, overdueInvoiceReply } from "../services/local-assistant-invoices";
import { detectFinancialMetric, financialMetricReply } from "../services/assistant-financial";
import { carregarFinanceiro } from "../services/financeiro.service";
import { cancelModelDownload, installLocalModel, isModelInstalled, releaseLocalModel, subscribeModelInstall } from "../services/on-device-model";
import { finishDictation, installVoiceModels, isVoiceInstalled, pauseContinuousListening, releaseVoiceRecognition, startContinuousListening, stopContinuousListening } from "../services/on-device-voice";
import { speakConversationOnline, speakSafeOnlineOrLocal, speakAuthorizedAccountOnline, stopAssistantVoice } from "../services/assistant-voice";
import { accountVoiceConsent, setAccountVoiceConsent } from "../services/assistant-voice-consent";
import { answerConversationOnline } from "../services/assistant-online";
import { assistantConnectionError, speechStatusReply } from "../services/assistant-diagnostics";
import { finishNativePortugueseSpeech, nativePortugueseSpeechAvailable, startNativePortugueseSpeech, stopNativePortugueseSpeech } from "../services/native-speech";
import { Colors } from "../theme";
import { buscarDashboardUsina } from "../services/usinas.service";
import { detectProductionMetric, productionMetricReply } from "../services/assistant-production";
import { detectAccountQuery, consultAccount } from "../services/assistant-account";
import { detectCapability, type AssistantAction, type AssistantDocument } from "../services/assistant-capabilities";
import { executeAssistantTool, resolveAssistantDocument } from "../services/assistant-tools";

type Message = { from: "user" | "assistant"; text: string; route?: LocalReply["route"]; invoiceId?: string; invoiceChoices?: Array<{ id: string; label: string }>; actions?: AssistantAction[]; documents?: AssistantDocument[]; private?: boolean; voiceAnswerId?: string };

export default function Assistente() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { authenticated, usuario, usinaSelecionada, unidadeSelecionada } = useAuth();
  const [accountVoiceAllowed, setAccountVoiceAllowed] = useState(false);
  useEffect(() => {
    let active = true;
    setAccountVoiceAllowed(false);
    if (usuario?.id) void accountVoiceConsent(String(usuario.id)).then(allowed => { if (active) setAccountVoiceAllowed(allowed); }).catch(() => {});
    return () => { active = false; };
  }, [usuario?.id]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [topic, setTopic] = useState<LocalTopic>();
  const [modelReady, setModelReady] = useState(isModelInstalled);
  const [busy, setBusy] = useState(false);
  const [installStage, setInstallStage] = useState<string>();
  const [installProgress, setInstallProgress] = useState<number | null>(null);
  const [downloadingModel, setDownloadingModel] = useState(false);
  const [voiceReady, setVoiceReady] = useState(isVoiceInstalled);
  const [listening, setListening] = useState(false);
  const [hearingSpeech, setHearingSpeech] = useState(false);
  const [speakingReply, setSpeakingReply] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>();
  const [voiceNotice, setVoiceNotice] = useState<string>();
  const [voiceInstalling, setVoiceInstalling] = useState(false);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string>();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const voiceActive = useRef(false);
  const dictationActive = useRef(false);
  const usingNativeSpeech = useRef(false);
  const micHeld = useRef(false);
  const dictationStarting = useRef(false);
  const dictatedText = useRef("");
  const lastInvoiceRequest = useRef(false);
  const busyRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const topicRef = useRef<LocalTopic | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);
  const accountContextKey = `${usuario?.id ?? ""}:${usuario?.empresa_id ?? ""}:${usinaSelecionada?.id ?? ""}:${unidadeSelecionada?.id ?? ""}`;
  const contextGeneration = useRef(0);
  useEffect(() => {
    contextGeneration.current += 1;
    messagesRef.current = [];
    setMessages([]);
    topicRef.current = undefined;
    lastInvoiceRequest.current = false;
    stopAssistantVoice();
  }, [accountContextKey]);
  const wave = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  useEffect(() => () => { voiceActive.current = false; dictationActive.current = false; stopAssistantVoice(); void stopNativePortugueseSpeech(); void releaseVoiceRecognition(); void releaseLocalModel(); }, []);
  useEffect(() => {
    if (!listening || (!hearingSpeech && !speakingReply)) {
      wave.forEach(value => value.setValue(0));
      return;
    }
    const animations = wave.map((value, index) => Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: 170 + index * 45, useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 220 + index * 35, useNativeDriver: true }),
    ])));
    animations.forEach(animation => animation.start());
    return () => animations.forEach(animation => animation.stop());
  }, [listening, hearingSpeech, speakingReply, wave]);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => subscribeModelInstall(state => {
    setDownloadingModel(state.phase === "conectando" || state.phase === "baixando");
    setInstallProgress(state.progress);
    if (state.phase === "pronto") {
      setModelReady(true);
      setInstallStage(undefined);
    } else if (state.phase === "erro") {
      setInstallStage(state.message ?? "Não foi possível instalar o modelo.");
    } else if (state.phase === "conectando") {
      setInstallStage("Conectando ao servidor do modelo…");
    } else if (state.phase === "baixando") {
      const baixados = state.downloadedBytes ? ` · ${(state.downloadedBytes / 1_000_000).toFixed(1)} MB` : "";
      setInstallStage(`Baixando modelo: ${Math.round((state.progress ?? 0) * 100)}%${baixados}`);
    } else if (state.phase === "verificando") {
      setInstallStage("Verificando a integridade do modelo no aparelho…");
    }
    setBusy(state.active);
  }), []);

  if (!isPreviewEnvironment || !authenticated) return <Redirect href="/" />;

  async function openInvoicePdf(id: string) {
    if (openingInvoiceId) return;
    setOpeningInvoiceId(id);
    try {
      const invoice = await buscarFatura(id);
      const url = String(invoice?.pdf_unificada_url ?? "").trim();
      if (!/^https:\/\//i.test(url)) {
        Alert.alert("PDF indisponível", "A fatura foi encontrada, mas o PDF unificado ainda não está disponível para baixar.");
        return;
      }
      if (Platform.OS === "web") { await Linking.openURL(url); return; }
      const file = await File.downloadFileAsync(url, new File(Paths.document, `fatura-andrade-${id.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`), { idempotent: true });
      if (!file.exists || !file.size || file.size < 512) throw new Error("Arquivo vazio");
      if (Platform.OS === "android") {
        try {
          const contentUri = await FileSystemLegacy.getContentUriAsync(file.uri);
          await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, flags: 1, type: "application/pdf" });
          return;
        } catch { /* Usa o compartilhamento quando não há visualizador de PDF. */ }
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { dialogTitle: "Abrir ou salvar fatura", mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      else Alert.alert("PDF salvo", "A fatura foi salva no aplicativo.");
    } catch {
      Alert.alert("Não consegui abrir o PDF", "O link pode ter expirado ou a conexão falhou. Tente novamente; não gere outra cobrança.");
    } finally {
      setOpeningInvoiceId(undefined);
    }
  }

  function openAssistantAction(action: AssistantAction) {
    const open = () => router.push({ pathname: action.route, params: action.params } as any);
    if (action.review) Alert.alert("Revisar no aplicativo", "Vou abrir a tela correspondente. Nenhuma alteração foi executada pela IA; confira os dados e confirme na própria tela.", [{ text: "Voltar", style: "cancel" }, { text: "Abrir revisão", onPress: open }]);
    else open();
  }

  function configureAccountVoice() {
    if (!usuario?.id) return;
    const userId = String(usuario.id);
    Alert.alert("Voz natural nos dados da conta", "Ao autorizar, o texto das respostas com valores de faturas, produção e nomes será enviado ao Google Gemini e, se necessário, à Microsoft Azure somente para gerar a voz. Não enviaremos PDFs, senhas ou códigos de acesso. Você pode revogar nesta opção.", [
      { text: "Voltar", style: "cancel" },
      { text: accountVoiceAllowed ? "Revogar autorização" : "Autorizar voz natural", onPress: () => {
        const allowed = !accountVoiceAllowed;
        void setAccountVoiceConsent(userId, allowed).then(() => setAccountVoiceAllowed(allowed)).catch(() => Alert.alert("Não foi possível salvar", "Tente novamente."));
      } },
    ]);
  }

  async function openToolDocument(doc: AssistantDocument) {
    if (openingInvoiceId) return;
    const key = `${doc.kind}:${doc.id}`;
    const generation = contextGeneration.current;
    setOpeningInvoiceId(key);
    try {
      const resolved = await resolveAssistantDocument(doc);
      if (generation !== contextGeneration.current) return;
      let uri = resolved.file;
      if (!uri) {
        if (!resolved.url || !/^https:\/\//i.test(resolved.url)) throw new Error("Documento indisponível");
        if (Platform.OS === "web") { await Linking.openURL(resolved.url); return; }
        const file = await File.downloadFileAsync(resolved.url, new File(Paths.cache, `documento-${doc.kind}-${doc.id.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`), { idempotent: true });
        if (!file.exists || !file.size || file.size < 512) throw new Error("Arquivo vazio");
        uri = file.uri;
      }
      if (generation !== contextGeneration.current) return;
      if (Platform.OS === "android") {
        try {
          const contentUri = await FileSystemLegacy.getContentUriAsync(uri);
          await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: contentUri, flags: 1, type: "application/pdf" });
          return;
        } catch { /* Sem leitor instalado: oferecer salvar/compartilhar. */ }
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { dialogTitle: "Abrir ou salvar documento", mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      else Alert.alert("Documento salvo", "O documento foi salvo no aplicativo.");
    } catch {
      Alert.alert("Documento indisponível", "O PDF pode não ter sido gerado ou seu acesso pode ter mudado. Confira o contexto e tente novamente; não vou criar um arquivo inexistente.");
    } finally { setOpeningInvoiceId(undefined); }
  }

  async function send(spokenQuestion?: string) {
    const question = (spokenQuestion ?? input).trim();
    if (!question || busyRef.current) return;
    const interpretedQuestion = normalizeAssistantQuery(question);
    const wantsOverdue = asksOverdueInvoices(interpretedQuestion);
    const capability = wantsOverdue ? undefined : detectCapability(interpretedQuestion);
    const generation = contextGeneration.current;
    const wantsInvoiceDocument = asksLatestInvoiceDocument(interpretedQuestion, lastInvoiceRequest.current);
    lastInvoiceRequest.current = wantsInvoiceDocument || /\b(ultima|mais recente)\b.*\b(fatura|cobranca)\b|\b(fatura|cobranca)\b.*\b(ultima|mais recente)\b/i.test(interpretedQuestion);
    busyRef.current = true;
    const { reply, topic: nextTopic } = answerInConversation(question, {
      authenticated: true,
      variant: IS_GERADOR_APP ? "gerador" : "consumidor",
    }, topicRef.current);
    setInput("");
    setBusy(true);
    const privateTurn = wantsOverdue || Boolean(capability) || wantsInvoiceDocument || asksLatestInvoiceAmount(interpretedQuestion) || Boolean(detectFinancialMetric(interpretedQuestion)) || Boolean(detectProductionMetric(interpretedQuestion)) || Boolean(detectAccountQuery(interpretedQuestion));
    const userMessage: Message = { from: "user", text: question, private: privateTurn };
    const nextMessages = [...messagesRef.current, userMessage].slice(-39);
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    try {
      if (voiceActive.current) {
        setVoiceStatus("Processando sua pergunta…");
        setHearingSpeech(false);
        if (usingNativeSpeech.current) await stopNativePortugueseSpeech();
        else await pauseContinuousListening();
      }
      let response: Message = { from: "assistant", text: reply.text, route: reply.route };
      const speechStatus = speechStatusReply(question, Boolean(spokenQuestion));
      if (speechStatus) {
        response = { from: "assistant", text: speechStatus, private: true };
      } else if (capability) {
        try {
          response = { from: "assistant", ...await executeAssistantTool(capability, {
            generator: IS_GERADOR_APP, role: usuario?.perfil,
            plantId: usinaSelecionada?.id, unitId: unidadeSelecionada?.id,
            unitNumber: unidadeSelecionada?.numero, clientId: unidadeSelecionada?.cliente_id ?? usuario?.cliente_id,
          }, interpretedQuestion) };
        } catch {
          response = { from: "assistant", text: "Não consegui consultar essa função agora com seu acesso. Não alterei dados nem estimei valores. Confira o contexto da conta e tente novamente." };
        }
      } else if (wantsOverdue || wantsInvoiceDocument || asksLatestInvoiceAmount(interpretedQuestion)) {
        try {
          const invoices = usuario?.perfil === "LEITURA"
            ? unidadeSelecionada?.numero
              ? await listarFaturas(undefined, unidadeSelecionada.numero)
              : (unidadeSelecionada?.cliente_id ?? usuario?.cliente_id)
                ? await listarFaturas(unidadeSelecionada?.cliente_id ?? usuario?.cliente_id)
                : []
            : usinaSelecionada?.id
              ? await listarFaturas(undefined, undefined, usinaSelecionada.id)
              : [];
          if (usuario?.perfil !== "LEITURA" && !usinaSelecionada?.id) {
            response = { from: "assistant", text: "Não consigo escolher uma fatura sem uma usina selecionada. Selecione a usina da carteira para eu consultar o documento correto." };
          } else if (wantsOverdue) {
            const result = overdueInvoiceReply(invoices);
            response = { from: "assistant", text: result.text, invoiceChoices: result.invoices.filter(f => f.pdf_unificada_url).slice(0, 12).map(f => ({ id: f.id, label: `PDF · ${f.referencia ?? "Fatura em atraso"}` })) };
          } else if (wantsInvoiceDocument) {
            const candidates = invoiceDocumentChoices(question, invoices);
            const invoice = candidates[0];
            const available = candidates.filter(item => item.pdf_unificada_url);
            if (candidates.length > 1) {
              response = available.length ? { from: "assistant", text: "Encontrei estas faturas no seu acesso. Toque no documento que deseja abrir ou salvar.", invoiceChoices: available.map(item => ({ id: item.id, label: `PDF · ${item.referencia ?? "Fatura emitida"}` })) } : { from: "assistant", text: "Encontrei as faturas, mas seus PDFs ainda não estão disponíveis. Não posso entregar um documento que ainda não foi gerado." };
            } else {
            response = !invoice
              ? { from: "assistant", text: "Não encontrei uma fatura emitida que corresponda ao seu pedido nesta conta ou usina. Por isso não há PDF para eu anexar aqui." }
              : invoice.pdf_unificada_url
                ? { from: "assistant", text: `Encontrei a última fatura${invoice.referencia ? ` (${invoice.referencia})` : ""}. Toque abaixo para abrir ou salvar o PDF.`, invoiceId: invoice.id }
                : { from: "assistant", text: "Encontrei a última fatura, mas o PDF unificado ainda não está disponível no servidor. Não posso criar um arquivo que ainda não foi gerado; confira o detalhe da fatura mais tarde." };
            }
          } else {
            response = { from: "assistant", text: latestInvoiceAmountReply(invoices) };
          }
        } catch {
          response = { from: "assistant", text: "Não consegui consultar as faturas agora. Verifique a conexão e tente novamente; não vou estimar um valor." };
        }
      } else if (detectProductionMetric(interpretedQuestion)) {
        const selectedPlantId = IS_GERADOR_APP ? usinaSelecionada?.id : unidadeSelecionada?.usina_id;
        if (!selectedPlantId) {
          response = { from: "assistant", text: "Selecione uma usina ou UC vinculada para eu consultar os dados de produção corretos." };
        } else {
          try {
            response = { from: "assistant", text: productionMetricReply(await buscarDashboardUsina(selectedPlantId), detectProductionMetric(interpretedQuestion)!) };
          } catch {
            response = { from: "assistant", text: "Não consegui consultar a produção desta usina com seu acesso. Não vou inventar valores; tente novamente ou confira a usina selecionada." };
          }
        }
      } else if (IS_GERADOR_APP && detectFinancialMetric(interpretedQuestion)) {
        const metric = detectFinancialMetric(interpretedQuestion)!;
        if (!usinaSelecionada?.id) {
          response = { from: "assistant", text: "Selecione uma usina para consultar os valores do resumo financeiro." };
        } else {
          try {
            response = { from: "assistant", text: financialMetricReply(await carregarFinanceiro(usinaSelecionada.id), metric) };
          } catch {
            response = { from: "assistant", text: "Não consegui consultar o resumo financeiro agora. Verifique a conexão e tente novamente; não vou estimar valores." };
          }
        }
      } else if (detectAccountQuery(interpretedQuestion)) {
        try {
          response = { from: "assistant", text: await consultAccount(detectAccountQuery(interpretedQuestion)!, IS_GERADOR_APP, usinaSelecionada?.id) };
        } catch {
          response = { from: "assistant", text: "Não consegui consultar esses registros agora com seu acesso. Tente novamente; não vou inventar dados nem contornar suas permissões." };
        }
      } else if (reply.kind === "help" || reply.kind === "unknown") {
        response = { from: "assistant", ...await answerConversationOnline(question, nextMessages.slice(0, -1)) };
      }
      if (generation !== contextGeneration.current) return;
      response.private = response.private || privateTurn;
      messagesRef.current = [...messagesRef.current, response].slice(-40);
      setMessages(messagesRef.current);
      topicRef.current = nextTopic;
      setTopic(nextTopic);
      if (voiceActive.current) {
        setVoiceStatus("Falando com você… depois volto a ouvir.");
        setSpeakingReply(true);
        const finishReply = () => { setSpeakingReply(false); if (voiceActive.current) void resumeVoice(); };
        if (response.voiceAnswerId && !response.private) {
          setVoiceStatus("Preparando a voz natural…");
          void speakConversationOnline(response.voiceAnswerId, response.text, finishReply, reason => { setVoiceStatus(reason); setVoiceNotice(reason); });
        } else if (accountVoiceAllowed) {
          setVoiceStatus("Preparando a voz natural da consulta…");
          void speakAuthorizedAccountOnline(response.text, finishReply, reason => { setVoiceStatus(reason); setVoiceNotice(reason); });
        } else {
          setVoiceStatus("Resposta no chat. Autorize Voz natural nos dados para ouvir esta consulta; não usei a voz do aparelho.");
          setVoiceNotice("Autorize Voz natural nos dados para ouvir consultas da conta. A voz do aparelho não será usada automaticamente.");
          finishReply();
        }
      }
    } catch (error) {
      if (generation !== contextGeneration.current) return;
      const fallback: Message = { from: "assistant", private: true, text: assistantConnectionError(error) };
      messagesRef.current = [...messagesRef.current, fallback].slice(-40);
      setMessages(messagesRef.current);
      if (voiceActive.current) {
        setVoiceStatus("Não consegui processar esta resposta. Vou ouvir sua próxima pergunta.");
        setSpeakingReply(true);
        const finishFallback = () => { setSpeakingReply(false); if (voiceActive.current) void resumeVoice(); };
        setVoiceStatus("Resposta no chat. Não troquei para a voz do aparelho.");
        finishFallback();
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function resumeVoice() {
    try {
      setVoiceStatus("Ouvindo sua pergunta…");
      usingNativeSpeech.current = await startNativePortugueseSpeech(text => { void send(text); }, error => {
        voiceActive.current = false;
        setListening(false);
        setVoiceStatus(error);
      }, setHearingSpeech, () => {
        if (voiceActive.current && !busyRef.current) void resumeVoice();
      });
      if (usingNativeSpeech.current) return;
      await startContinuousListening(text => { void send(text); }, error => {
        voiceActive.current = false;
        setListening(false);
        setVoiceStatus(error);
        void stopContinuousListening();
      }, true, setHearingSpeech);
    } catch (error) {
      voiceActive.current = false;
      setListening(false);
      setVoiceStatus(error instanceof Error ? error.message : "O microfone não iniciou.");
    }
  }

  async function toggleVoice() {
    if (dictationActive.current) return;
    if (voiceActive.current) {
      voiceActive.current = false;
      setListening(false);
      setHearingSpeech(false);
      setSpeakingReply(false);
      stopAssistantVoice();
      if (usingNativeSpeech.current) await stopNativePortugueseSpeech();
      else await stopContinuousListening();
      setVoiceStatus(undefined);
      return;
    }
    if (!voiceReady && !(await nativePortugueseSpeechAvailable())) {
      setBusy(true);
      setVoiceInstalling(true);
      try { await installVoiceModels((stage, progress) => setVoiceStatus(progress == null ? stage : `${stage}: ${Math.round(progress * 100)}%`)); setVoiceReady(true); }
      catch (error) { setVoiceStatus(error instanceof Error ? error.message : "Não foi possível instalar a voz."); return; }
      finally { setBusy(false); setVoiceInstalling(false); }
    }
    voiceActive.current = true;
    setListening(true);
    setVoiceStatus("Falando com você…");
    setSpeakingReply(true);
    // A frase online é fixa para não enviar o nome do cliente ao provedor de voz.
    const greeting = "Olá! Como posso ajudar?";
    const finishGreeting = () => {
      setSpeakingReply(false);
      if (voiceActive.current) void resumeVoice();
    };
    void speakSafeOnlineOrLocal("welcome", greeting, finishGreeting, reason => { setVoiceStatus(reason); setVoiceNotice(reason); });
  }

  async function endDictation() {
    micHeld.current = false;
    if (dictationStarting.current || !dictationActive.current) return;
    dictationActive.current = false;
    setTranscribing(false);
    setVoiceStatus("Transcrevendo sua fala…");
    try {
      const finalTranscription = usingNativeSpeech.current ? await finishNativePortugueseSpeech() : await finishDictation();
      const spoken = (dictatedText.current || finalTranscription).trim();
      dictatedText.current = "";
      if (spoken) {
        setVoiceStatus("Enviando sua pergunta…");
        await send(spoken);
        setVoiceStatus(undefined);
      } else {
        setVoiceStatus("Não consegui reconhecer sua fala. Segure o microfone e tente novamente.");
      }
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "Não consegui transcrever a fala.");
      if (usingNativeSpeech.current) await stopNativePortugueseSpeech();
      else await stopContinuousListening();
    }
  }

  async function beginDictation() {
    if (voiceActive.current || busy) return;
    micHeld.current = true;
    dictatedText.current = "";
    dictationStarting.current = true;
    setBusy(true);
    setVoiceInstalling(true);
    try {
      if (!voiceReady && !(await nativePortugueseSpeechAvailable())) {
        await installVoiceModels((stage, progress) => setVoiceStatus(progress == null ? stage : `${stage}: ${Math.round(progress * 100)}%`));
        setVoiceReady(true);
      }
      dictationActive.current = true;
      setTranscribing(true);
      setVoiceStatus("Ouvindo… solte o microfone para enviar.");
      usingNativeSpeech.current = await startNativePortugueseSpeech(
        text => { dictatedText.current = text; setInput(text); setVoiceStatus("Fala capturada. Solte para enviar."); },
        error => { setVoiceStatus(error); },
      );
      if (!usingNativeSpeech.current) await startContinuousListening(
        text => { dictatedText.current = `${dictatedText.current} ${text}`.trim(); setInput(dictatedText.current); setVoiceStatus("Fala capturada. Solte para enviar."); },
        error => {
          dictationActive.current = false;
          setTranscribing(false);
          setVoiceStatus(error);
          void stopContinuousListening();
        },
      );
    } catch (error) {
      dictationActive.current = false;
      setTranscribing(false);
      setVoiceStatus(error instanceof Error ? error.message : "Não foi possível iniciar a transcrição.");
      if (usingNativeSpeech.current) await stopNativePortugueseSpeech();
      else await stopContinuousListening();
    } finally {
      dictationStarting.current = false;
      setBusy(false);
      setVoiceInstalling(false);
      if (!micHeld.current && dictationActive.current) void endDictation();
    }
  }

  async function install() {
    if (busy) return;
    try { await installLocalModel(); } catch { /* O estado global exibe o erro. */ }
  }

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
      <View style={styles.headerText}><Text style={styles.title}>Ajuda Andrade Energy</Text><Text style={styles.subtitle}>Conversa online · consultas da sua conta</Text></View>
      <Pressable disabled={busy} onPress={() => { messagesRef.current = []; topicRef.current = undefined; setMessages([]); setTopic(undefined); void releaseLocalModel(); }} accessibilityRole="button" accessibilityLabel="Limpar conversa"><Text style={styles.clear}>Limpar</Text></Pressable>
    </View>
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
      {messages.length === 0 ? <View style={styles.intro}><Text style={styles.introTitle}>Como posso ajudar?</Text><Text style={styles.introBody}>Consulte dados da sua conta, peça documentos ou abra as funções do app para revisão. Para ditar, segure o microfone e solte; para conversar por voz, toque nas ondas.</Text><Text style={styles.limit}>A conversa usa o Gemini online. Não é necessário baixar um modelo local. Consultas respeitam seu acesso; alterações exigem revisão nas telas do aplicativo.</Text></View> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Configurar voz natural nos dados da conta" onPress={configureAccountVoice} style={styles.action}><Text style={styles.actionText}>Voz natural nos dados · {accountVoiceAllowed ? "autorizada" : "autorizar"}</Text></Pressable>
      {installStage ? <View style={styles.progressCard} accessibilityLiveRegion="polite"><Text style={styles.limit}>{installStage}</Text>{installProgress !== null ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(installProgress * 100)}%` }]} /></View> : null}{downloadingModel ? <Pressable accessibilityRole="button" accessibilityLabel="Cancelar download do modelo" onPress={() => void cancelModelDownload()} style={styles.cancelDownload}><Text style={styles.cancelDownloadText}>Cancelar download</Text></Pressable> : null}</View> : null}
      {messages.map((message, index) => <View key={index} style={[styles.bubble, message.from === "user" ? styles.userBubble : styles.assistantBubble]}>
        <Text style={styles.message}>{message.text}</Text>
        {message.invoiceId ? <Pressable accessibilityRole="button" accessibilityLabel="Abrir PDF da última fatura" disabled={Boolean(openingInvoiceId)} onPress={() => void openInvoicePdf(message.invoiceId!)} style={styles.action}><Text style={styles.actionText}>{openingInvoiceId === message.invoiceId ? "Abrindo PDF…" : "Abrir PDF da fatura"}</Text></Pressable> : null}
        {message.invoiceChoices?.map(document => <Pressable key={document.id} accessibilityRole="button" accessibilityLabel={`Abrir ${document.label}`} disabled={Boolean(openingInvoiceId)} onPress={() => void openInvoicePdf(document.id)} style={styles.action}><Text style={styles.actionText}>{openingInvoiceId === document.id ? "Abrindo PDF…" : document.label}</Text></Pressable>)}
        {message.documents?.map(document => <Pressable key={`${document.kind}:${document.id}`} accessibilityRole="button" accessibilityLabel={`Abrir ${document.label}`} disabled={Boolean(openingInvoiceId)} onPress={() => void openToolDocument(document)} style={styles.action}><Text style={styles.actionText}>{openingInvoiceId === `${document.kind}:${document.id}` ? "Abrindo documento…" : document.label}</Text></Pressable>)}
        {message.actions?.map((action, index) => <Pressable key={`${action.route}:${index}`} accessibilityRole="button" accessibilityLabel={action.label} onPress={() => openAssistantAction(action)} style={styles.action}><Text style={styles.actionText}>{action.label}</Text></Pressable>)}
        {message.route ? <Pressable accessibilityRole="button" onPress={() => router.push(message.route!)} style={styles.action}><Text style={styles.actionText}>Abrir seção</Text></Pressable> : null}
      </View>)}
    </ScrollView>
    <View style={[styles.composer, { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 12) }]}>
      {voiceStatus ? <View style={styles.voiceStatus}><Ionicons name={voiceInstalling ? "cloud-download-outline" : transcribing || listening ? "radio-outline" : "information-circle-outline"} size={17} color={Colors.primary} /><Text style={styles.voiceStatusText}>{voiceStatus}</Text></View> : null}
      {voiceNotice ? <Pressable accessibilityRole="button" accessibilityLabel="Dispensar aviso de voz" onPress={() => setVoiceNotice(undefined)} style={styles.voiceStatus}><Ionicons name="information-circle-outline" size={17} color={Colors.primary} /><Text style={styles.voiceStatusText}>{voiceNotice}</Text></Pressable> : null}
      <View style={styles.inputPill}>
        <TextInput value={input} onChangeText={setInput} placeholder="Escreva sua pergunta" placeholderTextColor={Colors.subtitle} multiline maxLength={1000} accessibilityLabel="Sua pergunta" style={styles.input} />
        {input.trim() && !transcribing && !dictationStarting.current
          ? <Pressable onPress={() => void send()} disabled={busy} accessibilityRole="button" accessibilityLabel="Enviar pergunta" style={[styles.pillSend, busy && styles.disabled]}><Ionicons name="arrow-up" size={22} color="white" /></Pressable>
          : <Pressable onPressIn={() => { Keyboard.dismiss(); void beginDictation(); }} onPressOut={() => { void endDictation(); }} disabled={listening || (busy && !dictationStarting.current && !transcribing)} accessibilityRole="button" accessibilityLabel="Segure para falar e solte para enviar" style={[styles.pillAction, transcribing && styles.voiceActive, listening && styles.disabled]}><Ionicons name="mic-outline" size={22} color={transcribing ? "white" : Colors.text} /></Pressable>}
        <Pressable onPress={() => { Keyboard.dismiss(); void toggleVoice(); }} disabled={transcribing || (busy && !listening)} accessibilityRole="button" accessibilityLabel={listening ? "Encerrar conversa por voz" : "Iniciar conversa por voz"} style={[styles.pillAction, transcribing && styles.disabled]}>
          {voiceInstalling ? <ActivityIndicator size="small" color={Colors.primary} /> : <View style={styles.waveform}>{[7, 16, 10, 5].map((height, index) => <Animated.View key={index} style={[styles.waveBar, { height, backgroundColor: Colors.text, transform: [{ scaleY: wave[index].interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }]} />)}</View>}
        </Pressable>
      </View>
    </View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.header, paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  back: { width: 32, alignItems: "center" }, backText: { color: "white", fontSize: 32 },
  headerText: { flex: 1 }, title: { color: "white", fontSize: 18, fontWeight: "700" }, subtitle: { color: "#D8EBE1", fontSize: 12 }, clear: { color: "white", fontSize: 14 },
  scroll: { flex: 1 }, content: { padding: 18, gap: 12 }, intro: { backgroundColor: Colors.surface, padding: 18, borderRadius: 18 },
  introTitle: { color: Colors.text, fontSize: 19, fontWeight: "700" }, introBody: { color: Colors.text, marginTop: 8, lineHeight: 22 }, limit: { color: Colors.subtitle, marginTop: 12, lineHeight: 20 },
  bubble: { maxWidth: "88%", padding: 14, borderRadius: 18 }, userBubble: { alignSelf: "flex-end", backgroundColor: Colors.primaryLight }, assistantBubble: { alignSelf: "flex-start", backgroundColor: Colors.surface }, message: { color: Colors.text, fontSize: 16, lineHeight: 22 },
  action: { marginTop: 10, alignSelf: "flex-start", backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 }, actionText: { color: "white", fontWeight: "700" },
  progressCard: { backgroundColor: Colors.surface, paddingHorizontal: 18, paddingBottom: 16, borderRadius: 18 },
  progressTrack: { height: 9, marginTop: 10, borderRadius: 8, overflow: "hidden", backgroundColor: Colors.primaryLight },
  progressFill: { height: "100%", backgroundColor: Colors.primary },
  cancelDownload: { alignSelf: "flex-start", marginTop: 12, paddingVertical: 6 },
  cancelDownloadText: { color: Colors.primary, fontWeight: "700" },
  composer: { gap: 8, backgroundColor: Colors.background, paddingHorizontal: 12, paddingTop: 10 },
  voiceStatus: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9, paddingVertical: 5 },
  voiceStatusText: { flex: 1, color: Colors.subtitle, fontSize: 12, lineHeight: 17 },
  inputPill: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 7, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border, borderRadius: 30, backgroundColor: Colors.surface, elevation: 3 },
  input: { flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9, color: Colors.text, fontSize: 15 },
  pillAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  waveform: { width: 23, height: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  waveBar: { width: 2, borderRadius: 2, backgroundColor: Colors.text },
  pillSend: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: Colors.primary },
  voiceActive: { backgroundColor: "#A33131" }, disabled: { opacity: 0.45 },
});
