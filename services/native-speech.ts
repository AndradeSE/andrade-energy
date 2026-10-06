import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
type ExpoSpeechRecognitionModuleType = typeof import("expo-speech-recognition").ExpoSpeechRecognitionModule;

const ExpoSpeechRecognitionModule = Platform.OS === "android"
  ? requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>("ExpoSpeechRecognition") : null;

let available: boolean | undefined;
let active = false;
let activeOwner: string | undefined;
let availabilityError = "O reconhecimento offline em português não está disponível neste aparelho.";
export const nativeSpeechAvailabilityError = () => availabilityError;
let lastText = "";
let completed = "";
let finishResolver: ((text: string) => void) | undefined;
let subscriptions: Array<{ remove(): void }> = [];

export async function nativePortugueseSpeechAvailable() {
  if (available === true) return true;
  if (!ExpoSpeechRecognitionModule) { availabilityError = "Esta instalação não contém o módulo de microfone. É necessário atualizar o APK Preview."; return false; }
  if (!ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Verifique o mesmo reconhecedor offline do sistema usado por start().
    // Fixar o pacote Google aqui verificava um serviço diferente em alguns aparelhos.
    const locales = await Promise.race([
      ExpoSpeechRecognitionModule.getSupportedLocales({}),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), 5000); }),
    ]);
    available = locales.installedLocales.some(locale => /^pt[-_]br$/i.test(locale));
    availabilityError = "O serviço offline do Android não possui português (Brasil) instalado. Confira os idiomas de reconhecimento de fala nas configurações do aparelho.";
  } catch {
    available = false;
    availabilityError = "O serviço de reconhecimento do Android não respondeu. Tente novamente ou confira o serviço de voz nas configurações do aparelho.";
  } finally {
    if (timer) clearTimeout(timer);
  }
  return available;
}

function cleanup() {
  subscriptions.forEach(subscription => subscription.remove());
  subscriptions = [];
  active = false;
  activeOwner = undefined;
}

export async function startNativePortugueseSpeech(onFinal: (text: string) => void, onError: (message: string) => void, onActivity?: (active: boolean) => void, onEmptyEnd?: () => void, options?: { onPartial?: (text: string) => void; onEnd?: () => void; shouldContinue?: () => boolean; onReady?: () => void; owner?: string }) {
  if (!(await nativePortugueseSpeechAvailable()) || !ExpoSpeechRecognitionModule) return false;
  const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!permission.granted) throw new Error("O microfone não foi autorizado.");
  if (options?.shouldContinue && !options.shouldContinue()) return false;
  if (active) await stopNativePortugueseSpeech();
  if (options?.shouldContinue && !options.shouldContinue()) return false;
  lastText = "";
  completed = "";
  subscriptions = [
    ExpoSpeechRecognitionModule.addListener("audiostart", () => options?.onReady?.()),
    ExpoSpeechRecognitionModule.addListener("speechstart", () => onActivity?.(true)),
    ExpoSpeechRecognitionModule.addListener("speechend", () => onActivity?.(false)),
    ExpoSpeechRecognitionModule.addListener("result", event => {
      const text = event.results[0]?.transcript?.trim();
      if (!text) return;
      lastText = text;
      onActivity?.(true);
      if (!event.isFinal) options?.onPartial?.(text);
      if (event.isFinal) {
        completed = text;
        finishResolver?.(text);
        finishResolver = undefined;
        onFinal(text);
      }
    }),
    ExpoSpeechRecognitionModule.addListener("error", event => {
      const noSpeech = event.error === "no-speech" || event.error === "speech-timeout";
      if (event.error !== "aborted" && event.error !== "no-speech" && event.error !== "speech-timeout") {
        onError(event.error === "not-allowed" ? "Permissão do microfone negada. Autorize nas configurações do aplicativo." : `O reconhecimento de voz do Android falhou (${event.error}). Confira o idioma e o acesso ao microfone.`);
      }
      finishResolver?.(lastText);
      finishResolver = undefined;
      cleanup();
      onActivity?.(false);
      if (noSpeech) onEmptyEnd?.();
    }),
    ExpoSpeechRecognitionModule.addListener("end", () => {
      const empty = !completed && !lastText && !finishResolver;
      finishResolver?.(completed || lastText);
      finishResolver = undefined;
      cleanup();
      onActivity?.(false);
      if (empty) onEmptyEnd?.();
      options?.onEnd?.();
    }),
  ];
  active = true;
  activeOwner = options?.owner;
  try {
    ExpoSpeechRecognitionModule.start({ lang: "pt-BR", continuous: false, interimResults: true, requiresOnDeviceRecognition: true });
  } catch (error) {
    cleanup();
    throw error;
  }
  return true;
}

export async function finishNativePortugueseSpeech() {
  if (!active || !ExpoSpeechRecognitionModule) return completed || lastText;
  const result = new Promise<string>(resolve => { finishResolver = resolve; });
  ExpoSpeechRecognitionModule.stop();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<string>(resolve => { timer = setTimeout(() => resolve(completed || lastText), 1800); });
  const text = await Promise.race([result, timeout]);
  if (timer) clearTimeout(timer);
  finishResolver = undefined;
  if (active) ExpoSpeechRecognitionModule.abort();
  cleanup();
  return text;
}

export async function stopNativePortugueseSpeech(owner?: string) {
  if (owner !== undefined && activeOwner !== owner) return;
  if (active) ExpoSpeechRecognitionModule?.abort();
  cleanup();
  finishResolver?.("");
  finishResolver = undefined;
}
