import { useEffect, useState, useSyncExternalStore } from "react";
import { Alert, AppState } from "react-native";
import { router, usePathname } from "expo-router";
import { containsAssistantWakeWord, setWakeWordEnabled, setWakeWordReady, subscribeWakeWord, wakeWordEnabled, wakeWordPaused, wakeWordReady } from "../../services/assistant-wake-word";
import { nativeSpeechAvailabilityError } from "../../services/native-speech";
import { startAssistantSpeech as startNativePortugueseSpeech, stopAssistantSpeech as stopNativePortugueseSpeech } from "../../services/assistant-speech-session";
import { isAssistantLoading, subscribeAssistantLoading } from "../../services/assistant-overlay-visibility";

export default function AssistantWakeWord() {
  const enabled = useSyncExternalStore(subscribeWakeWord, wakeWordEnabled);
  const paused = useSyncExternalStore(subscribeWakeWord, wakeWordPaused);
  const loading = useSyncExternalStore(subscribeAssistantLoading, isAssistantLoading);
  const pathname = usePathname();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    if (!enabled || pathname === "/assistente" || !foreground || paused || loading) return;
    // O prazo só vale quando a frase-chave pode realmente iniciar a captura.
    const deadline = setTimeout(() => {
      if (wakeWordEnabled() && !wakeWordReady() && !wakeWordPaused()) {
        setWakeWordEnabled(false);
        Alert.alert("Escuta não iniciada", "O Android não confirmou o reconhecimento de voz. A ativação foi desligada.");
      }
    }, 22000);
    return () => clearTimeout(deadline);
  }, [enabled, pathname, foreground, paused, loading]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => { subscription.remove(); setWakeWordEnabled(false); };
  }, []);
  useEffect(() => {
    setWakeWordReady(false);
    if (!enabled || !foreground || loading || paused || pathname === "/assistente") return;
    let cancelled = false;
    let triggered = false;
    const owner = `wake-${Date.now()}-${Math.random()}`;
    let timer: ReturnType<typeof setTimeout>;
    let opened = false;
    let startupDeadline: ReturnType<typeof setTimeout>;
    const retry = () => {
      if (cancelled || triggered) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void listen(); }, 900);
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
          if (!containsAssistantWakeWord(text)) return;
          triggered = true;
          void stopNativePortugueseSpeech(owner).then(() => {
            if (!cancelled) router.push({ pathname: "/assistente", params: { voiceWake: String(Date.now()) } });
          });
        };
        const started = await startNativePortugueseSpeech(detect, fail, undefined, retry, {
          onPartial: detect, onEnd: retry, shouldContinue: () => !cancelled && !triggered,
          owner, onReady: () => { if (!cancelled && !triggered) { opened = true; clearTimeout(startupDeadline); setWakeWordReady(true); } },
        });
        if (cancelled) await stopNativePortugueseSpeech(owner);
        else if (!started && !triggered) fail(nativeSpeechAvailabilityError());
      } catch { fail("Não consegui iniciar o microfone. Confira a permissão e tente novamente."); }
    };
    // Prazo global: reinícios e permissões pendentes não podem renovar a espera.
    startupDeadline = setTimeout(() => { if (!opened) fail("Nenhum reconhecedor conseguiu iniciar o microfone. A ativação foi desligada."); }, 20000);
    retry();
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(startupDeadline); setWakeWordReady(false); void stopNativePortugueseSpeech(owner); };
  }, [enabled, foreground, loading, paused, pathname]);
  return null;
}
