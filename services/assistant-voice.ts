import * as Speech from "expo-speech";

let preferredVoice: string | undefined;
let voicesChecked = false;

export async function prepareAssistantVoice() {
  if (voicesChecked) return;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const brazilian = voices.filter(voice => /^pt[-_]BR$/i.test(voice.language));
    const local = brazilian.filter(voice => !/network|online/i.test(`${voice.identifier} ${voice.name}`));
    const candidates = local.length ? local : brazilian;
    preferredVoice = candidates.find(voice => voice.quality === Speech.VoiceQuality.Enhanced)?.identifier
      ?? candidates[0]?.identifier;
    voicesChecked = true;
  } catch {
    // Usa a voz pt-BR padrão quando o aparelho não informa as vozes instaladas.
  }
}

export function speakAssistantReply(text: string, onDone: () => void) {
  Speech.speak(text, {
    language: "pt-BR",
    voice: preferredVoice,
    rate: 0.94,
    pitch: 1,
    onDone,
    onError: onDone,
  });
}
