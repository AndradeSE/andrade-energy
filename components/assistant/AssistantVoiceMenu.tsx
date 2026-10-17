import { useEffect, useRef, useState } from "react";
import { Alert, AppState, StyleSheet, Switch, Text, View } from "react-native";
import { automaticLocalWakeConsent, setAutomaticLocalWakeConsent } from "../../services/assistant-voice-consent";
import { setWakeWordEnabled } from "../../services/assistant-wake-word";
import { installVoiceModels, isVoiceInstalled } from "../../services/on-device-voice";
import { Colors, Spacing } from "../../theme";

export default function AssistantVoiceMenu({ userId }: { userId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [progress, setProgress] = useState("");
  const mounted = useRef(true);
  const locked = useRef(false);
  useEffect(() => {
    mounted.current = true;
    void automaticLocalWakeConsent(userId).then(value => { if (mounted.current) setEnabled(value); }).catch(() => undefined).finally(() => { if (mounted.current) setBusy(false); });
    return () => { mounted.current = false; };
  }, [userId]);
  async function save(value: boolean) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      if (value && !isVoiceInstalled()) await installVoiceModels((stage, amount) => { if (mounted.current) setProgress(amount == null ? stage : `${stage}: ${Math.round(amount * 100)}%`); });
      if (!mounted.current && value) return;
      await setAutomaticLocalWakeConsent(userId, value);
      setWakeWordEnabled(value && AppState.currentState === "active", false, true);
      if (mounted.current) setEnabled(value);
    } catch (error) { Alert.alert("Não foi possível alterar o início por voz", error instanceof Error ? error.message : "Tente novamente."); }
    finally { locked.current = false; if (mounted.current) { setBusy(false); setProgress(""); } }
  }
  function change(value: boolean) {
    if (busy) return;
    if (!value) { setWakeWordEnabled(false); void save(false); return; }
    Alert.alert("Ativar início por voz da Solar", "Com o app aberto, o microfone aguarda a palavra ‘Solar’. Essa escuta é processada no aparelho e pode consumir bateria. Se necessário, será baixado o modelo de voz (cerca de 33 MB). Você pode desativar neste menu.", [{ text: "Agora não", style: "cancel" }, { text: "Ativar", onPress: () => { void save(true); } }]);
  }
  return <View style={styles.row}><View style={styles.copy}><Text style={styles.title}>Início por voz da Solar</Text><Text style={styles.description}>{busy ? progress || "Carregando…" : enabled ? "Ativado · diga Solar com o app aberto" : "Desativado · abra a Solar pelo botão"}</Text></View><Switch accessibilityLabel="Início por voz da Solar" value={enabled} disabled={busy} onValueChange={change} trackColor={{ true: Colors.primary }} /></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.md }, copy: { flex: 1 }, title: { color: Colors.text, fontSize: 15, fontWeight: "600" }, description: { color: Colors.text, opacity: 0.7, fontSize: 12, marginTop: 4 } });
