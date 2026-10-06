import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
type ExpoSpeechRecognitionModuleType = typeof import("expo-speech-recognition").ExpoSpeechRecognitionModule;

const ExpoSpeechRecognitionModule = Platform.OS === "android"
  ? requireOptionalNativeModule<ExpoSpeechRecognitionModuleType>("ExpoSpeechRecognition") : null;

let available: boolean | undefined;
let active = false;
let lastText = "";
let completed = "";
let finishResolver: ((text: string) => void) | undefined;
let subscriptions: Array<{ remove(): void }> = [];

export async function nativePortugueseSpeechAvailable() {
  if (available !== undefined) return available;
  if (!ExpoSpeechRecognitionModule || !ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()) return (available = false);
  try {
    const locales = await ExpoSpeechRecognitionModule.getSupportedLocales({ androidRecognitionServicePackage: "com.google.android.as" });
    available = locales.installedLocales.some(locale => /^pt[-_]br$/i.test(locale));
  } catch {
    available = false;
  }
  return available;
}

function cleanup() {
  subscriptions.forEach(subscription => subscription.remove());
  subscriptions = [];
  active = false;
}

export async function startNativePortugueseSpeech(onFinal: (text: string) => void, onError: (message: string) => void, onActivity?: (active: boolean) => void, onEmptyEnd?: () => void, options?: { onPartial?: (text: string) => void; onEnd?: () => void; shouldContinue?: () => boolean }) {
  if (!(await nativePortugueseSpeechAvailable()) || !ExpoSpeechRecognitionModule) return false;
  const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!permission.granted) throw new Error("O microfone não foi autorizado.");
  if (options?.shouldContinue && !options.shouldContinue()) return false;
  if (active) await stopNativePortugueseSpeech();
  lastText = "";
  completed = "";
  subscriptions = [
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
        onError("Não consegui reconhecer a fala no aparelho. Tente novamente.");
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
  try {
    ExpoSpeechRecognitionModule.start({ lang: "pt-BR", continuous: false, interimResults: true, requiresOnDeviceRecognition: true, androidRecognitionServicePackage: "com.google.android.as" });
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

export async function stopNativePortugueseSpeech() {
  if (active) ExpoSpeechRecognitionModule?.abort();
  cleanup();
  finishResolver?.("");
  finishResolver = undefined;
}
