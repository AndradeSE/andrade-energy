import * as Speech from "expo-speech";
import { createAudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import api from "../config/api";
import { isPreviewEnvironment } from "../config/environment";
import { choosePortugueseVoices } from "./assistant-voice-selection";

let preferredVoice: string | undefined;
let fallbackVoice: string | undefined;
let voicesChecked = false;
let onlineUnavailableUntil = 0;
let onlineQuotaReached = false;
let lastOnlineFailure = "A voz natural está temporariamente indisponível.";
let activePlayer: ReturnType<typeof createAudioPlayer> | undefined;
let activeFile: string | undefined;
let voiceGeneration = 0;

export function stopAssistantVoice() {
  voiceGeneration += 1;
  Speech.stop();
  activePlayer?.release();
  activePlayer = undefined;
  if (activeFile) void FileSystem.deleteAsync(activeFile, { idempotent: true });
  activeFile = undefined;
}

export async function speakSafeOnlineOrLocal(lineId: "welcome" | "retry", localText: string, onDone: () => void, onFallback?: (reason: string) => void) {
  return speakOnlineVoice({ lineId }, localText, onDone, onFallback);
}

// Only a short-lived server-issued reference is transmitted. Private invoice
// or financial answers never receive this reference and remain on the device.
export async function speakConversationOnline(answerId: string, localText: string, onDone: () => void, onFallback?: (reason: string) => void) {
  return speakOnlineVoice({ answerId }, localText, onDone, onFallback);
}

export async function speakAuthorizedAccountOnline(text: string, onDone: () => void, onFailure?: (reason: string) => void) {
  return speakOnlineVoice({ speechText: text.slice(0, 1600), accountVoiceConsent: true, azureVoiceConsent: true }, text, onDone, onFailure);
}

async function speakOnlineVoice(request: { lineId: "welcome" | "retry" } | { answerId: string } | { speechText: string; accountVoiceConsent: true; azureVoiceConsent: true }, localText: string, onDone: () => void, onFallback?: (reason: string) => void) {
  const generation = voiceGeneration;
  // Desligado por padrão: só pode ser ativado no Preview depois de configurar
  // GEMINI_TTS_API_KEY no backend de homologação e verificar o limite gratuito.
  if (!isPreviewEnvironment || process.env.EXPO_PUBLIC_ENABLE_SAFE_ONLINE_VOICE !== "1" || !FileSystem.cacheDirectory) {
    onFallback?.("A voz natural não está habilitada nesta instalação.");
    onDone();
    return;
  }
  if (Date.now() < onlineUnavailableUntil) {
    onFallback?.(lastOnlineFailure);
    if (onlineQuotaReached) {
      await prepareAssistantVoice();
      if (generation === voiceGeneration) speakAssistantReply(localText, onDone);
      return;
    }
    onDone();
    return;
  }
  try {
    const response = await api.post<{ audio: string; mimeType: string }>("/assistente/voz", request, { timeout: 16_000 });
    onlineQuotaReached = false;
    if (generation !== voiceGeneration) return;
    if (response.data.mimeType !== "audio/wav" || !response.data.audio) throw new Error("Áudio inválido");
    const file = `${FileSystem.cacheDirectory}andrade-voice-${Date.now()}.wav`;
    await FileSystem.writeAsStringAsync(file, response.data.audio, { encoding: FileSystem.EncodingType.Base64 });
    if (generation !== voiceGeneration) { await FileSystem.deleteAsync(file, { idempotent: true }); return; }
    const player = createAudioPlayer({ uri: file });
    activePlayer = player;
    activeFile = file;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      subscription.remove();
      clearTimeout(timeout);
      stopAssistantVoice();
      onDone();
    };
    const subscription = player.addListener("playbackStatusUpdate", status => {
      if (status.didJustFinish) finish();
    });
    const timeout = setTimeout(finish, 90_000);
    player.play();
  } catch (error) {
    if (generation !== voiceGeneration) return;
    // Falha temporária: tente novamente em outra interação, sem travar na voz
    // sintética até o próximo reinício do aplicativo.
    const failure = error as { response?: { status?: number; data?: { code?: string }; headers?: Record<string, string> } };
    const quota = failure.response?.status === 429 || failure.response?.data?.code === "TTS_QUOTA";
    onlineQuotaReached = quota;
    lastOnlineFailure = quota ? "Limite da voz natural atingido. Usando temporariamente a voz do aparelho." : "Não consegui gerar a voz natural agora. A resposta está no chat; não troquei para a voz do aparelho.";
    onlineUnavailableUntil = Date.now() + (quota ? 60_000 : 5_000);
    stopAssistantVoice();
    onFallback?.(lastOnlineFailure);
    if (quota) {
      const localGeneration = voiceGeneration;
      await prepareAssistantVoice();
      if (localGeneration === voiceGeneration) speakAssistantReply(localText, onDone);
      return;
    }
    onDone();
  }
}

export async function prepareAssistantVoice() {
  if (voicesChecked) return;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const selected = choosePortugueseVoices(voices);
    preferredVoice = selected.preferred;
    fallbackVoice = selected.fallback;
    voicesChecked = true;
  } catch {
    // Usa a voz pt-BR padrão quando o aparelho não informa as vozes instaladas.
  }
}

export function speakAssistantReply(text: string, onDone: () => void) {
  let finished = false;
  const finish = () => { if (!finished) { finished = true; onDone(); } };
  const speak = (voice?: string, retry = false) => Speech.speak(text, {
    language: "pt-BR", voice, rate: 0.98, pitch: 1,
    onDone: finish,
    onError: () => {
      if (!retry && voice && fallbackVoice && fallbackVoice !== voice) speak(fallbackVoice, true);
      else finish();
    },
  });
  speak(preferredVoice);
}
