import { AppState } from "react-native";
import { AudioModule, RecordingPresets, getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import { File } from "expo-file-system";
import api from "../config/api";
import { isAssistantEnabled as isPreviewEnvironment } from "../config/environment";

type Session = {
  recorder: InstanceType<typeof AudioModule.AudioRecorder>;
  valid: () => boolean; closed: boolean; finishing?: Promise<string>;
  timer?: ReturnType<typeof setInterval>; appState?: { remove(): void };
  controller: AbortController;
};
let session: Session | undefined;
function clearSessionListeners(value: Session) {
  if (value.timer) clearInterval(value.timer);
  value.appState?.remove();
}
function deleteAudio(uri: string | null) {
  if (!uri) return;
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Cache cleanup only. */ }
}
export async function stopOnlineSpeech() {
  const current = session;
  if (!current) return;
  session = undefined;
  current.closed = true;
  current.controller.abort();
  clearSessionListeners(current);
  try { await current.recorder.stop(); } catch { /* Already stopped. */ }
  let uri: string | null = null;
  try { uri = current.recorder.uri; } catch { /* A cancelled upload may have released it. */ }
  try { current.recorder.release(); } catch { /* Already released. */ }
  deleteAudio(uri);
  await setAudioModeAsync({ allowsRecording: false });
}
export async function finishOnlineSpeech(): Promise<string> {
  const current = session;
  if (!current || current.closed) return "";
  if (current.finishing) return current.finishing;
  current.finishing = (async () => {
    clearSessionListeners(current);
    let uri: string | null = null;
    try {
      const duration = current.recorder.getStatus().durationMillis;
      await current.recorder.stop();
      uri = current.recorder.uri;
      await setAudioModeAsync({ allowsRecording: false });
      if (current.closed || !current.valid() || !uri || duration < 300) return "";
      const file = new File(uri);
      if (!file.exists || file.size > 2_000_000) throw new Error("O áudio excedeu o tamanho permitido.");
      const body = new FormData();
      body.append("audioConsent", "true");
      body.append("audio", { uri, name: "speech.m4a", type: "audio/mp4" } as unknown as Blob);
      console.info("[AssistantSpeech] online-transcribing");
      const result = await api.post<{ text?: string }>("/assistente/transcrever", body, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 18_000, signal: current.controller.signal,
      });
      if (current.closed || !current.valid()) return "";
      console.info("[AssistantSpeech] online-transcribed", Boolean(result.data.text));
      return result.data.text?.trim() ?? "";
    } catch (error: any) {
      if (current.closed || !current.valid()) return "";
      throw new Error(error?.response?.data?.message || "Não consegui transcrever online. Confira a conexão e tente novamente.");
    } finally {
      try { current.recorder.release(); } catch { /* Cancelled session. */ }
      deleteAudio(uri);
      if (session === current) session = undefined;
    }
  })();
  return current.finishing;
}

export async function startOnlineSpeech(onFinal: (text: string) => void, onError: (message: string) => void, onActivity: ((active: boolean) => void) | undefined, onEmpty: (() => void) | undefined, options: { valid: () => boolean; dictation: boolean; wakeMode?: boolean; onReady?: () => void }) {
  if (!isPreviewEnvironment) throw new Error("Transcrição online disponível apenas no Preview.");
  await stopOnlineSpeech();
  // Pedir novamente pode abrir uma Activity de permissões mesmo já autorizado,
  // fazendo a proteção de segundo plano cancelar a ativação antes da captura.
  const existingPermission = await getRecordingPermissionsAsync();
  const permission = existingPermission.granted ? existingPermission : await requestRecordingPermissionsAsync();
  if (!permission.granted) throw new Error("Autorize o microfone nas configurações do aplicativo.");
  if (!options.valid() || AppState.currentState !== "active") return false;
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldPlayInBackground: false });
  if (!options.valid() || AppState.currentState !== "active") return false;
  const preset = RecordingPresets.HIGH_QUALITY;
  const recorder = new AudioModule.AudioRecorder({ ...preset, ...preset.android, sampleRate: 16000, numberOfChannels: 1, bitRate: 32000, isMeteringEnabled: true });
  const current: Session = { recorder, valid: options.valid, closed: false, controller: new AbortController() };
  session = current;
  try {
    await recorder.prepareToRecordAsync();
    if (current.closed || !options.valid()) {
      if (session === current) await stopOnlineSpeech();
      return false;
    }
    recorder.record();
    if (!recorder.getStatus().isRecording) throw new Error("O gravador não confirmou a abertura do microfone.");
    console.info("[AssistantSpeech] online-recording");
    options.onReady?.();
    let lastVoiceAt = 0;
    const startedAt = Date.now();
    let voiceSamples = 0;
    let firstVoiceAt = 0;
    let submitting = false;
    const submit = async () => {
      if (submitting) return;
      submitting = true;
      // A requisição de transcrição pode levar mais que o limite de silêncio
      // da conversa. Mantenha-a ocupada até chegar texto ou falha.
      onActivity?.(true);
      try {
        const text = await finishOnlineSpeech();
        onActivity?.(false);
        if (!options.valid() || current.closed) return;
        if (text) onFinal(text); else onEmpty?.();
      } catch (error) { if (options.valid()) onError(error instanceof Error ? error.message : "Falha na transcrição."); }
    };
    current.appState = AppState.addEventListener("change", state => {
      if (state !== "active") { void stopOnlineSpeech(); if (options.valid()) onError("Escuta pausada ao sair do aplicativo."); }
    });
    current.timer = setInterval(() => {
      if (current.closed || !options.valid()) { if (session === current) void stopOnlineSpeech(); return; }
      const now = Date.now();
      const level = recorder.getStatus().metering ?? -160;
      const speaking = level > -40;
      if (speaking) {
        if (!firstVoiceAt) firstVoiceAt = now;
        voiceSamples += 1;
        lastVoiceAt = now;
      }
      onActivity?.(speaking);
      if (options.dictation) {
        if (now - startedAt >= 30_000) { void stopOnlineSpeech(); onError("Limite de 30 segundos. Solte e grave uma nova pergunta."); }
      } else if ((lastVoiceAt && now - lastVoiceAt >= (options.wakeMode ? 800 : 950)) || now - startedAt >= (options.wakeMode ? 5000 : 10_000)) {
        // Um pico isolado de ruído não deve virar uma pergunta inventada.
        if (lastVoiceAt && voiceSamples >= 3 && lastVoiceAt - firstVoiceAt >= 300) void submit();
        else if (!submitting) {
          submitting = true;
          void stopOnlineSpeech().then(() => {
            if (!options.valid()) return;
            if (options.wakeMode) onEmpty?.();
            else onError("Não detectei fala. Toque nas ondas para tentar novamente.");
          });
        }
      }
    }, 150);
    return true;
  } catch (error) { if (session === current) await stopOnlineSpeech(); throw error; }
}
