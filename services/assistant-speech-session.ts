import { startNativePortugueseSpeech, stopNativePortugueseSpeech, finishNativePortugueseSpeech, nativeSpeechAvailabilityError } from "./native-speech";
import { isVoiceInstalled, startContinuousListening, stopContinuousListening, finishDictation } from "./on-device-voice";

// Uma sessão possui o microfone inteiro: motor Android primeiro, Whisper local
// já instalado em caso de falha. Nunca envia áudio nem baixa modelo implicitamente.
let generation = 0;
let owner: string | undefined;
let engine: "native" | "local" | undefined;
type Options = { onPartial?: (text: string) => void; onEnd?: () => void; shouldContinue?: () => boolean; onReady?: () => void; owner?: string };

export async function startAssistantSpeech(onFinal: (text: string) => void, onError: (message: string) => void, onActivity?: (active: boolean) => void, onEmptyEnd?: () => void, options?: Options) {
  // Uma chamada atrasada da frase-chave não pode encerrar o ditado/conversa.
  if (options?.shouldContinue && !options.shouldContinue()) return false;
  if (options?.owner?.startsWith("wake-") && engine && !owner?.startsWith("wake-")) return false;
  const current = ++generation;
  const previous = engine;
  engine = "native"; // Reserva também durante permissões/encerramento pendentes.
  console.info("[AssistantSpeech] session-start", current);
  owner = options?.owner;
  const valid = () => current === generation && (!options?.shouldContinue || options.shouldContinue());
  // Reserve a geração antes de qualquer await: a última solicitação vence.
  await stopNativePortugueseSpeech();
  if (previous === "local") await stopContinuousListening();
  if (!valid()) return false;
  let fallingBack = false;
  let ready = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const clearDeadline = () => { if (deadline) clearTimeout(deadline); deadline = undefined; };
  const fail = (message: string) => {
    if (!valid()) return;
    clearDeadline();
    void stopAssistantSpeech(options?.owner);
    onError(message);
  };
  const fallback = async (nativeError: string) => {
    if (!valid() || fallingBack) return;
    fallingBack = true;
    console.info("[AssistantSpeech] local-fallback", current);
    clearDeadline();
    await stopNativePortugueseSpeech();
    if (!valid()) return;
    if (!isVoiceInstalled()) { fail(`${nativeError} O reconhecimento local alternativo ainda não está instalado.`); return; }
    try {
      engine = "local";
      const dictation = Boolean(options?.onPartial) && !options?.owner?.startsWith("wake-");
      deadline = setTimeout(() => fail("O reconhecimento local não iniciou a captura. A tentativa foi encerrada."), 15000);
      await startContinuousListening(text => {
        if (!valid()) return;
        options?.onPartial?.(text);
        onFinal(text);
        // O reconhecedor local de conversa envia uma fala por sessão.
        // A ativação precisa continuar quando essa fala não contém a frase-chave.
        if (options?.owner?.startsWith("wake-")) options.onEnd?.();
      }, message => fail(message), !dictation, onActivity);
      if (!valid()) { await stopContinuousListening(); return; }
      clearDeadline();
      ready = true;
      options?.onReady?.();
    } catch (error) { fail(error instanceof Error ? error.message : "O reconhecimento local não iniciou."); }
  };
  try {
    engine = "native";
    deadline = setTimeout(() => { if (!ready) void fallback("O reconhecedor Android não ficou pronto."); }, 3500);
    const started = await startNativePortugueseSpeech(text => { if (valid() && !fallingBack) { console.info("[AssistantSpeech] transcript-received", current); onFinal(text); } }, message => { void fallback(message); }, value => { if (valid() && !fallingBack) onActivity?.(value); }, () => {
      if (valid() && !fallingBack) void fallback("O Android encerrou sem reconhecer a fala.");
    }, {
      ...options,
      shouldContinue: () => valid() && !fallingBack,
      onEnd: () => { if (valid() && !fallingBack) options?.onEnd?.(); },
      onReady: () => { if (valid() && !fallingBack) { console.info("[AssistantSpeech] native-ready", current); ready = true; clearDeadline(); options?.onReady?.(); } },
    });
    if (!valid()) { clearDeadline(); return false; }
    if (!started) await fallback(nativeSpeechAvailabilityError());
  } catch (error) { await fallback(error instanceof Error ? error.message : "O reconhecedor Android não iniciou."); }
  return valid();
}

export async function stopAssistantSpeech(requestOwner?: string) {
  if (requestOwner !== undefined && requestOwner !== owner) return;
  generation++;
  owner = undefined;
  const previous = engine;
  engine = undefined;
  await stopNativePortugueseSpeech();
  if (previous === "local") await stopContinuousListening();
}

export async function finishAssistantSpeech() {
  return engine === "local" ? finishDictation() : finishNativePortugueseSpeech();
}
