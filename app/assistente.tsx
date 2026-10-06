import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../contexts/AuthContext";
import { isPreviewEnvironment } from "../config/environment";
import { IS_GERADOR_APP } from "../config/appVariant";
import { answerInConversation, asksLatestInvoiceAmount, LocalReply, LocalTopic, VERIFIED_APP_CONTEXT } from "../services/local-assistant";
import { listarFaturas } from "../services/faturas.service";
import { latestInvoiceAmountReply } from "../services/local-assistant-invoices";
import { answerWithLocalModel, cancelModelDownload, installLocalModel, isModelInstalled, releaseLocalModel, subscribeModelInstall } from "../services/on-device-model";
import { finishDictation, installVoiceModels, isVoiceInstalled, pauseContinuousListening, startContinuousListening, stopContinuousListening } from "../services/on-device-voice";
import * as Speech from "expo-speech";
import { Colors } from "../theme";

type Message = { from: "user" | "assistant"; text: string; route?: LocalReply["route"] };

export default function Assistente() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { authenticated, usuario, usinaSelecionada, unidadeSelecionada } = useAuth();
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
  const [transcribing, setTranscribing] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>();
  const [voiceInstalling, setVoiceInstalling] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const voiceActive = useRef(false);
  const dictationActive = useRef(false);
  const micHeld = useRef(false);
  const dictationStarting = useRef(false);
  const busyRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const topicRef = useRef<LocalTopic | undefined>(undefined);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => () => { voiceActive.current = false; dictationActive.current = false; Speech.stop(); void stopContinuousListening(); void releaseLocalModel(); }, []);
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

  async function send(spokenQuestion?: string) {
    const question = (spokenQuestion ?? input).trim();
    if (!question || busyRef.current) return;
    busyRef.current = true;
    const { reply, topic: nextTopic } = answerInConversation(question, {
      authenticated: true,
      variant: IS_GERADOR_APP ? "gerador" : "consumidor",
    }, topicRef.current);
    setInput("");
    setBusy(true);
    const userMessage: Message = { from: "user", text: question };
    const nextMessages = [...messagesRef.current, userMessage].slice(-39);
    messagesRef.current = nextMessages;
    setMessages(nextMessages);
    try {
      if (voiceActive.current) {
        setVoiceStatus("Processando sua pergunta…");
        await pauseContinuousListening();
      }
      let response: Message = { from: "assistant", text: reply.text, route: reply.route };
      if (asksLatestInvoiceAmount(question)) {
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
          response = { from: "assistant", text: usuario?.perfil !== "LEITURA" && !usinaSelecionada?.id
            ? "Selecione uma usina para consultar a última fatura da carteira."
            : latestInvoiceAmountReply(invoices) };
        } catch {
          response = { from: "assistant", text: "Não consegui consultar as faturas agora. Verifique a conexão e tente novamente; não vou estimar um valor." };
        }
      } else if (modelReady && reply.kind === "unknown") {
        const history = nextMessages.slice(-8).map(message => ({ role: message.from, content: message.text }));
        response = { from: "assistant", text: await answerWithLocalModel(history, VERIFIED_APP_CONTEXT) };
      }
      messagesRef.current = [...messagesRef.current, response].slice(-40);
      setMessages(messagesRef.current);
      topicRef.current = nextTopic;
      setTopic(nextTopic);
      if (voiceActive.current) {
        setVoiceStatus("Respondendo… depois volto a ouvir.");
        Speech.speak(response.text, { language: "pt-BR", rate: 0.95, onDone: () => { if (voiceActive.current) void resumeVoice(); }, onError: () => { if (voiceActive.current) void resumeVoice(); } });
      }
    } catch (error) {
      const fallback: Message = { from: "assistant", text: reply.kind === "help" ? reply.text : "O modelo local não respondeu a esta pergunta. Tente reformular; também posso ajudar com funções do aplicativo." };
      messagesRef.current = [...messagesRef.current, fallback].slice(-40);
      setMessages(messagesRef.current);
      if (voiceActive.current) {
        setVoiceStatus(error instanceof Error ? error.message : "Não consegui processar a fala.");
        voiceActive.current = false;
        setListening(false);
        void stopContinuousListening();
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function resumeVoice() {
    try {
      setVoiceStatus("Ouvindo sua pergunta…");
      await startContinuousListening(text => { void send(text); }, error => {
        voiceActive.current = false;
        setListening(false);
        setVoiceStatus(error);
        void stopContinuousListening();
      });
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
      Speech.stop();
      await stopContinuousListening();
      setVoiceStatus(undefined);
      return;
    }
    if (!voiceReady) {
      setBusy(true);
      setVoiceInstalling(true);
      try { await installVoiceModels((stage, progress) => setVoiceStatus(progress == null ? stage : `${stage}: ${Math.round(progress * 100)}%`)); setVoiceReady(true); }
      catch (error) { setVoiceStatus(error instanceof Error ? error.message : "Não foi possível instalar a voz."); return; }
      finally { setBusy(false); setVoiceInstalling(false); }
    }
    voiceActive.current = true;
    setListening(true);
    await resumeVoice();
  }

  async function endDictation() {
    micHeld.current = false;
    if (dictationStarting.current || !dictationActive.current) return;
    dictationActive.current = false;
    setTranscribing(false);
    setVoiceStatus("Transcrevendo sua fala…");
    try {
      await finishDictation();
      setVoiceStatus("Texto pronto para revisar e enviar.");
    } catch (error) {
      setVoiceStatus(error instanceof Error ? error.message : "Não consegui transcrever a fala.");
      await stopContinuousListening();
    }
  }

  async function beginDictation() {
    if (voiceActive.current || busy) return;
    micHeld.current = true;
    dictationStarting.current = true;
    setBusy(true);
    setVoiceInstalling(true);
    try {
      if (!voiceReady) {
        await installVoiceModels((stage, progress) => setVoiceStatus(progress == null ? stage : `${stage}: ${Math.round(progress * 100)}%`));
        setVoiceReady(true);
      }
      dictationActive.current = true;
      setTranscribing(true);
      setVoiceStatus("Ouvindo… solte o microfone para transcrever.");
      await startContinuousListening(
        text => { setInput(previous => `${previous.trim()} ${text}`.trim()); setVoiceStatus("Fala capturada. Solte para terminar."); },
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
      await stopContinuousListening();
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
      <View style={styles.headerText}><Text style={styles.title}>Ajuda Andrade Energy</Text><Text style={styles.subtitle}>{modelReady ? "IA local pronta · respostas em teste" : "Ajuda básica · instale o modelo para conversar"}</Text></View>
      <Pressable disabled={busy} onPress={() => { messagesRef.current = []; topicRef.current = undefined; setMessages([]); setTopic(undefined); void releaseLocalModel(); }} accessibilityRole="button" accessibilityLabel="Limpar conversa"><Text style={styles.clear}>Limpar</Text></Pressable>
    </View>
    <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
      {messages.length === 0 ? <View style={styles.intro}><Text style={styles.introTitle}>Como posso ajudar?</Text><Text style={styles.introBody}>Pergunte sobre faturas, contratos e funções do app. Para ditar, segure o microfone e solte; para conversar por voz, toque nas ondas.</Text><Text style={styles.limit}>{modelReady ? "Modelo local instalado. A conversa livre pode conter erros; confira dados importantes no aplicativo." : "A ajuda básica já funciona. Instale o modelo opcional para conversar livremente em português."}</Text>{!modelReady ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void install()} style={styles.action}><Text style={styles.actionText}>Instalar modelo local</Text></Pressable> : null}</View> : null}
      {installStage ? <View style={styles.progressCard} accessibilityLiveRegion="polite"><Text style={styles.limit}>{installStage}</Text>{installProgress !== null ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(installProgress * 100)}%` }]} /></View> : null}{downloadingModel ? <Pressable accessibilityRole="button" accessibilityLabel="Cancelar download do modelo" onPress={() => void cancelModelDownload()} style={styles.cancelDownload}><Text style={styles.cancelDownloadText}>Cancelar download</Text></Pressable> : null}</View> : null}
      {messages.map((message, index) => <View key={index} style={[styles.bubble, message.from === "user" ? styles.userBubble : styles.assistantBubble]}>
        <Text style={styles.message}>{message.text}</Text>
        {message.route ? <Pressable accessibilityRole="button" onPress={() => router.push(message.route!)} style={styles.action}><Text style={styles.actionText}>Abrir seção</Text></Pressable> : null}
      </View>)}
    </ScrollView>
    <View style={[styles.composer, { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 12) }]}>
      {voiceStatus ? <View style={styles.voiceStatus}><Ionicons name={voiceInstalling ? "cloud-download-outline" : transcribing || listening ? "radio-outline" : "information-circle-outline"} size={17} color={Colors.primary} /><Text style={styles.voiceStatusText}>{voiceStatus}</Text></View> : null}
      <View style={styles.inputPill}>
        <TextInput value={input} onChangeText={setInput} placeholder="Pergunte à Andrade Energy" placeholderTextColor={Colors.subtitle} multiline maxLength={1000} accessibilityLabel="Sua pergunta" style={styles.input} />
        <Pressable onPressIn={() => { Keyboard.dismiss(); void beginDictation(); }} onPressOut={() => { void endDictation(); }} disabled={listening || (busy && !dictationStarting.current && !transcribing)} accessibilityRole="button" accessibilityLabel="Segure para falar e solte para transcrever" style={[styles.pillAction, transcribing && styles.voiceActive, listening && styles.disabled]}><Ionicons name="mic-outline" size={22} color={transcribing ? "white" : Colors.primary} /></Pressable>
        <Pressable onPress={() => { Keyboard.dismiss(); void toggleVoice(); }} disabled={transcribing || (busy && !listening)} accessibilityRole="button" accessibilityLabel={listening ? "Encerrar conversa por voz" : "Iniciar conversa por voz"} style={[styles.pillAction, listening && styles.voiceActive, transcribing && styles.disabled]}>
          {voiceInstalling ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name={listening ? "stop-circle-outline" : "pulse-outline"} size={23} color={listening ? "white" : Colors.primary} />}
        </Pressable>
        {input.trim() ? <Pressable onPress={() => void send()} disabled={busy || transcribing} accessibilityRole="button" accessibilityLabel="Enviar pergunta" style={[styles.pillSend, (busy || transcribing) && styles.disabled]}><Ionicons name="arrow-up" size={22} color="white" /></Pressable> : null}
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
  composer: { gap: 8, backgroundColor: Colors.surface, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  voiceStatus: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 9, paddingVertical: 5 },
  voiceStatusText: { flex: 1, color: Colors.subtitle, fontSize: 12, lineHeight: 17 },
  inputPill: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 7, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border, borderRadius: 30, backgroundColor: Colors.background },
  input: { flex: 1, maxHeight: 120, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9, color: Colors.text, fontSize: 15 },
  pillAction: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  pillSend: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: Colors.primary },
  voiceActive: { backgroundColor: "#A33131" }, disabled: { opacity: 0.45 },
});
