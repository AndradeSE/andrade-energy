import * as Speech from "expo-speech";
import { choosePortugueseVoices } from "./assistant-voice-selection";

let preferredVoice: string | undefined;
let fallbackVoice: string | undefined;
let voicesChecked = false;

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
