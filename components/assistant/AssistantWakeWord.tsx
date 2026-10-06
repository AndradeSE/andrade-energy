import { useEffect, useState, useSyncExternalStore } from "react";
import { Alert, AppState, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { containsAssistantWakeWord, setWakeWordEnabled, setWakeWordReady, subscribeWakeWord, wakeWordEnabled, wakeWordPaused } from "../../services/assistant-wake-word";
import { startNativePortugueseSpeech, stopNativePortugueseSpeech, nativeSpeechAvailabilityError } from "../../services/native-speech";
import { isAssistantLoading, subscribeAssistantLoading } from "../../services/assistant-overlay-visibility";

export default function AssistantWakeWord() {
  const enabled = useSyncExternalStore(subscribeWakeWord, wakeWordEnabled);
  const paused = useSyncExternalStore(subscribeWakeWord, wakeWordPaused);
  const [ready, setReady] = useState(false);
  const loading = useSyncExternalStore(subscribeAssistantLoading, isAssistantLoading);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => { subscription.remove(); setWakeWordEnabled(false); };
  }, []);
  useEffect(() => {
    setReady(false);
    setWakeWordReady(false);
    if (!enabled || !foreground || loading || paused) return;
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
          owner, onReady: () => { if (!cancelled && !triggered) { opened = true; clearTimeout(startupDeadline); setReady(true); setWakeWordReady(true); } },
        });
        if (cancelled) await stopNativePortugueseSpeech(owner);
        else if (!started && !triggered) fail(nativeSpeechAvailabilityError());
      } catch { fail("Não consegui iniciar o microfone. Confira a permissão e tente novamente."); }
    };
    // Prazo global: reinícios e permissões pendentes não podem renovar a espera.
    startupDeadline = setTimeout(() => { if (!opened) fail("O microfone não iniciou. A ativação foi desligada para evitar ficar presa em ‘Iniciando escuta’. Confira a permissão e o serviço de voz do Android."); }, 10000);
    retry();
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(startupDeadline); setWakeWordReady(false); void stopNativePortugueseSpeech(owner); };
  }, [enabled, foreground, loading, paused, pathname]);
  if (!enabled || !foreground || loading || paused) return null;
  return <Pressable accessibilityLabel="Ativação por voz. Toque para desligar" onPress={() => setWakeWordEnabled(false)} style={{ position: "absolute", top: insets.top + 4, right: 12, zIndex: 60, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: "#F0FFF6" }}><Text style={{ color: "#075E42", fontSize: 11 }}>{ready ? "🎙 E aí, chat · desligar" : "Iniciando escuta…"}</Text></Pressable>;
}
