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

export async function speakSafeOnlineOrLocal(lineId: "welcome" | "retry", localText: string, onDone: () => void, onFallback?: () => void) {
  const generation = voiceGeneration;
  // Desligado por padrão: só pode ser ativado no Preview depois de configurar
  // GEMINI_TTS_API_KEY no backend de homologação e verificar o limite gratuito.
  if (!isPreviewEnvironment || process.env.EXPO_PUBLIC_ENABLE_SAFE_ONLINE_VOICE !== "1" || !FileSystem.cacheDirectory) {
    speakAssistantReply(localText, onDone);
    return;
  }
  if (Date.now() < onlineUnavailableUntil) {
    onFallback?.();
    speakAssistantReply(localText, onDone);
    return;
  }
  try {
    const response = await api.post<{ audio: string; mimeType: string }>("/assistente/voz", { lineId }, { timeout: 16_000 });
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
    const timeout = setTimeout(finish, 20_000);
    player.play();
  } catch {
    if (generation !== voiceGeneration) return;
    // Falha temporária: tente novamente em outra interação, sem travar na voz
    // sintética até o próximo reinício do aplicativo.
    onlineUnavailableUntil = Date.now() + 30_000;
    stopAssistantVoice();
    onFallback?.();
    speakAssistantReply(localText, onDone);
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
