import { useEffect, useState, useSyncExternalStore } from "react";
import { Alert, AppState, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { containsAssistantWakeWord, setWakeWordEnabled, subscribeWakeWord, wakeWordEnabled } from "../../services/assistant-wake-word";
import { startNativePortugueseSpeech, stopNativePortugueseSpeech } from "../../services/native-speech";
import { isAssistantLoading, subscribeAssistantLoading } from "../../services/assistant-overlay-visibility";

export default function AssistantWakeWord() {
  const enabled = useSyncExternalStore(subscribeWakeWord, wakeWordEnabled);
  const loading = useSyncExternalStore(subscribeAssistantLoading, isAssistantLoading);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => setForeground(state === "active"));
    return () => { subscription.remove(); setWakeWordEnabled(false); };
  }, []);
  useEffect(() => {
    if (!enabled || !foreground || loading || pathname === "/assistente") return;
    let cancelled = false;
    let triggered = false;
    let timer: ReturnType<typeof setTimeout>;
    const retry = () => {
      if (cancelled || triggered) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void listen(); }, 900);
    };
    const fail = (message: string) => {
      if (cancelled) return;
      setWakeWordEnabled(false);
      Alert.alert("Ativação por voz pausada", message);
    };
    const listen = async () => {
      if (cancelled || triggered) return;
      try {
        const started = await startNativePortugueseSpeech(text => {
          if (cancelled || triggered) return;
          if (!containsAssistantWakeWord(text)) { retry(); return; }
          triggered = true;
          void stopNativePortugueseSpeech().then(() => {
            if (!cancelled) router.push({ pathname: "/assistente", params: { voiceWake: String(Date.now()) } });
          });
        }, fail, undefined, retry);
        if (cancelled) await stopNativePortugueseSpeech();
        else if (!started) fail("O reconhecimento offline em português não está disponível neste aparelho. Use o botão de conversa.");
      } catch { fail("Não consegui iniciar o microfone. Confira a permissão e tente novamente."); }
    };
    retry();
    return () => { cancelled = true; clearTimeout(timer); void stopNativePortugueseSpeech(); };
  }, [enabled, foreground, loading, pathname]);
  if (!enabled || !foreground || loading || pathname === "/assistente") return null;
  return <Pressable accessibilityLabel="Microfone ativo para E aí chat. Toque para desligar" onPress={() => setWakeWordEnabled(false)} style={{ position: "absolute", top: insets.top + 4, right: 12, zIndex: 60, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: "#F0FFF6" }}><Text style={{ color: "#075E42", fontSize: 11 }}>🎙 E aí, chat · desligar</Text></Pressable>;
}
