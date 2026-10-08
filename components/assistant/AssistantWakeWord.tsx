import { useEffect, useState, useSyncExternalStore } from "react";
import { Alert, AppState, Vibration } from "react-native";
import { router, usePathname } from "expo-router";
import { consumeWakeWordDiagnostic, containsAssistantWakeWord, setWakeWordEnabled, setWakeWordReady, subscribeWakeWord, wakeWordEnabled, wakeWordPaused, wakeWordReady } from "../../services/assistant-wake-word";
import { nativeSpeechAvailabilityError } from "../../services/native-speech";
import { startAssistantSpeech as startNativePortugueseSpeech, stopAssistantSpeech as stopNativePortugueseSpeech } from "../../services/assistant-speech-session";
import { isAssistantLoading, subscribeAssistantLoading } from "../../services/assistant-overlay-visibility";
import { wakeWordOnlineConsent, wakeWordRemainingMs } from "../../services/assistant-wake-word";
import { floatingConversationRequest, openFloatingConversation, subscribeFloatingConversation } from "../../services/assistant-floating-conversation";

export default function AssistantWakeWord() {
  const enabled = useSyncExternalStore(subscribeWakeWord, wakeWordEnabled);
  const paused = useSyncExternalStore(subscribeWakeWord, wakeWordPaused);
  const loading = useSyncExternalStore(subscribeAssistantLoading, isAssistantLoading);
  const floatingConversation = useSyncExternalStore(subscribeFloatingConversation, floatingConversationRequest);
  const pathname = usePathname();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    if (!enabled) return;
    const expiry = setTimeout(() => setWakeWordEnabled(false), wakeWordRemainingMs());
    return () => clearTimeout(expiry);
  }, [enabled]);
  useEffect(() => {
    if (!enabled || !foreground || paused || loading || floatingConversation) return;
    // O prazo só vale quando a frase-chave pode realmente iniciar a captura.
    const deadline = setTimeout(() => {
      if (wakeWordEnabled() && !wakeWordReady() && !wakeWordPaused()) {
        setWakeWordEnabled(false);
        Alert.alert("Escuta não iniciada", "O Android não confirmou o reconhecimento de voz. A ativação foi desligada.");
      }
    }, 22000);
    return () => clearTimeout(deadline);
  }, [enabled, pathname, foreground, paused, loading, floatingConversation]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      setForeground(state === "active");
      if (state !== "active") setWakeWordEnabled(false);
    });
    return () => { subscription.remove(); setWakeWordEnabled(false); };
  }, []);
  useEffect(() => {
    console.info("[AssistantWake] conditions", enabled, foreground, loading, paused);
    setWakeWordReady(false);
    if (!enabled || !foreground || loading || paused || floatingConversation) return;
    let cancelled = false;
    let triggered = false;
    const owner = `wake-${Date.now()}-${Math.random()}`;
    let timer: ReturnType<typeof setTimeout>;
    let opened = false;
    const online = wakeWordOnlineConsent();
    let startupDeadline: ReturnType<typeof setTimeout>;
    const retry = () => {
      if (cancelled || triggered) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void listen(); }, online ? 100 : 900);
    };
    const fail = (message: string) => {
      if (cancelled) return;
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(startupDeadline);
      void stopNativePortugueseSpeech(owner);
      setWakeWordEnabled(false);
      Alert.alert("Ativação por voz pausada", message);
    };
    const listen = async () => {
      if (cancelled || triggered) return;
      try {
        const detect = (text: string) => {
          if (cancelled || triggered) return;
          if (consumeWakeWordDiagnostic()) {
            triggered = true;
            setWakeWordEnabled(false);
            void stopNativePortugueseSpeech(owner).then(() => Alert.alert("Texto reconhecido neste teste", text.slice(0, 180)));
            return;
          }
          const matched = containsAssistantWakeWord(text);
          console.info("[AssistantWake] candidate", text.trim().length, matched);
          if (!matched) { if (online) retry(); return; }
          triggered = true;
          Vibration.vibrate(120);
          void stopNativePortugueseSpeech(owner).then(() => {
            if (!cancelled) {
              if (pathname === "/assistente") router.push({ pathname: "/assistente", params: { voiceWake: String(Date.now()) } });
              else openFloatingConversation();
            }
          });
        };
        const started = await startNativePortugueseSpeech(detect, fail, undefined, retry, {
          onPartial: detect, onEnd: retry, wakeOnlineConsent: online,
          shouldContinue: () => !cancelled && !triggered && wakeWordRemainingMs() > 0,
          owner, onReady: () => { if (!cancelled && !triggered) { if (!opened) Vibration.vibrate(50); opened = true; clearTimeout(startupDeadline); setWakeWordReady(true); } },
        });
        if (cancelled) await stopNativePortugueseSpeech(owner);
        else if (!started && !triggered) fail(nativeSpeechAvailabilityError());
      } catch { fail("Não consegui iniciar o microfone. Confira a permissão e tente novamente."); }
    };
    // Prazo global: reinícios e permissões pendentes não podem renovar a espera.
    startupDeadline = setTimeout(() => { if (!opened) fail("Nenhum reconhecedor conseguiu iniciar o microfone. A ativação foi desligada."); }, 20000);
    retry();
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(startupDeadline); setWakeWordReady(false); void stopNativePortugueseSpeech(owner); };
  }, [enabled, foreground, loading, paused, pathname, floatingConversation]);
  return null;
}
