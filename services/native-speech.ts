import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
type ExpoSpeechRecognitionModuleType = typeof import("expo-speech-recognition").ExpoSpeechRecognitionModule;

const ExpoSpeechRecognitionModule = Platform.OS === "android"
  ? requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>("ExpoSpeechRecognition") : null;

let active = false;
let startupTimer: ReturnType<typeof setTimeout> | undefined;
let activeOwner: string | undefined;
let availabilityError = "O reconhecimento offline em português não está disponível neste aparelho.";
export const nativeSpeechAvailabilityError = () => availabilityError;
let lastText = "";
let completed = "";
let finishResolver: ((text: string) => void) | undefined;
let subscriptions: Array<{ remove(): void }> = [];

export async function nativePortugueseSpeechAvailable() {
  if (!ExpoSpeechRecognitionModule) { availabilityError = "Esta instalação não contém o módulo de microfone. É necessário atualizar o APK Preview."; return false; }
  try {
    // checkRecognitionSupport/getSupportedLocales falha em alguns serviços OEM.
    // A disponibilidade do motor é suficiente para tentar abrir pt-BR offline;
    // só os eventos reais de start() confirmam captura ou idioma indisponível.
    const supported = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    availabilityError = "Este Android não disponibiliza reconhecimento offline. Use a transcrição local instalada ou configure um serviço de reconhecimento compatível.";
    return supported;
  } catch {
    availabilityError = "Não consegui verificar o motor de reconhecimento offline deste Android.";
    return false;
  }
}

function cleanup() {
  if (startupTimer) clearTimeout(startupTimer);
  startupTimer = undefined;
  subscriptions.forEach(subscription => subscription.remove());
  subscriptions = [];
  active = false;
  activeOwner = undefined;
}

export async function startNativePortugueseSpeech(onFinal: (text: string) => void, onError: (message: string) => void, onActivity?: (active: boolean) => void, onEmptyEnd?: () => void, options?: { onPartial?: (text: string) => void; onEnd?: () => void; shouldContinue?: () => boolean; onReady?: () => void; owner?: string }) {
  if (!(await nativePortugueseSpeechAvailable()) || !ExpoSpeechRecognitionModule) return false;
  let permissionTimer: ReturnType<typeof setTimeout> | undefined;
  const permission = await Promise.race([
    ExpoSpeechRecognitionModule.requestPermissionsAsync(),
    new Promise<never>((_, reject) => { permissionTimer = setTimeout(() => reject(new Error("O Android não respondeu à permissão do microfone. A escuta não iniciou.")), 10000); }),
  ]).finally(() => { if (permissionTimer) clearTimeout(permissionTimer); });
  if (!permission.granted) throw new Error("O microfone não foi autorizado.");
  if (options?.shouldContinue && !options.shouldContinue()) return false;
  if (active) await stopNativePortugueseSpeech();
  if (options?.shouldContinue && !options.shouldContinue()) return false;
  lastText = "";
  completed = "";
  let microphoneOpened = false;
  subscriptions = [
    // audiostart é emitido logo após startListening(), antes da resposta do motor.
    // start corresponde a onReadyForSpeech: só então o Android está ouvindo.
    ExpoSpeechRecognitionModule.addListener("start", () => {
      microphoneOpened = true;
      if (startupTimer) clearTimeout(startupTimer);
      startupTimer = undefined;
      options?.onReady?.();
    }),
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
      console.info("[AssistantSpeech] native-error", event.error);
      const noSpeech = event.error === "no-speech" || event.error === "speech-timeout";
      if (event.error === "aborted") {
        cleanup();
        finishResolver?.(lastText);
        finishResolver = undefined;
        onActivity?.(false);
        onError("O reconhecedor Android interrompeu a escuta inesperadamente.");
        return;
      }
      if (event.error !== "no-speech" && event.error !== "speech-timeout") {
        onError(event.error === "not-allowed" ? "Permissão do microfone negada. Autorize nas configurações do aplicativo." : event.error === "language-not-supported" ? "O reconhecedor não conseguiu iniciar português (Brasil) offline. Instale esse idioma no serviço de reconhecimento do Android." : event.error === "audio-capture" ? "O Android não conseguiu capturar áudio. Confira se o acesso ao microfone está ligado e se outro aplicativo o está usando." : `O reconhecimento de voz do Android falhou (${event.error}). Confira o idioma e o acesso ao microfone.`);
      }
      finishResolver?.(lastText);
      finishResolver = undefined;
      cleanup();
      onActivity?.(false);
      if (!microphoneOpened && noSpeech) {
        onError("O reconhecedor encerrou antes de abrir o microfone. Nenhuma escuta foi ativada.");
        return;
      }
      if (noSpeech) onEmptyEnd?.();
    }),
    ExpoSpeechRecognitionModule.addListener("end", () => {
      console.info("[AssistantSpeech] native-end", Boolean(lastText), Boolean(completed));
      // Alguns motores encerram a sessão depois de fornecer apenas resultados
      // parciais. Preserve essa fala em vez de deixar a conversa em "Ouvindo".
      const partialFinal = !completed && lastText ? lastText : "";
      const empty = !completed && !lastText && !finishResolver;
      finishResolver?.(completed || lastText);
      finishResolver = undefined;
      cleanup();
      onActivity?.(false);
      if (!microphoneOpened) {
        onError("O reconhecedor encerrou antes de abrir o microfone. Nenhuma escuta foi ativada.");
        return;
      }
      if (partialFinal) onFinal(partialFinal);
      if (empty) onEmptyEnd?.();
      options?.onEnd?.();
    }),
  ];
  active = true;
  activeOwner = options?.owner;
  startupTimer = setTimeout(() => {
    void stopNativePortugueseSpeech(options?.owner).then(() => onError("O motor offline não abriu o microfone em 8 segundos. Confira o serviço de reconhecimento do Android e a permissão do microfone."));
  }, 8000);
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
  const shouldAbort = active;
  cleanup();
  if (shouldAbort) ExpoSpeechRecognitionModule.abort();
  return text;
}

export async function stopNativePortugueseSpeech(owner?: string) {
  if (owner !== undefined && activeOwner !== owner) return;
  const shouldAbort = active;
  // Retire os listeners antes do cancelamento solicitado pelo app. Assim um
  // cancelamento voluntário não parece uma falha e não dispara o fallback.
  cleanup();
  if (shouldAbort) ExpoSpeechRecognitionModule?.abort();
  finishResolver?.("");
  finishResolver = undefined;
}
