import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Card } from "../ui";
import { Colors, Spacing } from "../../theme";
import { installLocalModel, cancelModelDownload, isModelInstalled, subscribeModelInstall } from "../../services/on-device-model";
import { loadAssistantResponseMode, saveAssistantResponseMode } from "../../services/assistant-response-mode";

export default function AssistantLocalModelSettings({ userId }: { userId: string }) {
  const [local, setLocal] = useState(false);
  const [ready, setReady] = useState(isModelInstalled);
  const [installing, setInstalling] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void loadAssistantResponseMode(userId).then(mode => { if (active) setLocal(mode === "local"); }).catch(() => { if (active) setStatus("Não foi possível carregar a preferência."); }).finally(() => { if (active) setLoading(false); });
    const unsubscribe = subscribeModelInstall(state => {
      if (!active) return;
      setReady(isModelInstalled()); setInstalling(state.active);
      setStatus(state.message ?? (state.phase === "baixando" ? `Baixando: ${Math.round((state.progress ?? 0) * 100)}%` : state.phase === "verificando" ? "Verificando integridade do modelo…" : state.phase === "pronto" ? "Modelo instalado." : ""));
    });
    return () => { active = false; unsubscribe(); };
  }, [userId]);
  if (Platform.OS !== "android") return null;
  return <Card><Text style={styles.title}>Respostas no aparelho</Text><View style={styles.row}><View style={styles.copy}><Text style={styles.label}>Usar modelo local</Text><Text style={styles.hint}>Responde textos no aparelho. Consultas atuais e documentos usam internet e seu acesso; comandos e confirmações são os mesmos do modo online. A conversa por voz Live continua online, com autorização separada.</Text></View><Switch accessibilityLabel="Usar modelo local da Solar" disabled={loading || !userId} value={local} onValueChange={async value => { setLoading(true); try { await saveAssistantResponseMode(userId, value ? "local" : "online"); setLocal(value); } catch { Alert.alert("Preferência não salva", "Tente novamente."); } finally { setLoading(false); } }} /></View><Text style={styles.hint}>{ready ? "Modelo instalado. A capacidade de interpretação depende do aparelho e pode ser menor que a da IA online." : "Download opcional de aproximadamente 484 MB; requer 1,2 GB livres. Não baixa automaticamente."}</Text>{!ready && !installing ? <Pressable accessibilityRole="button" accessibilityLabel="Baixar modelo local da Solar" style={styles.button} onPress={() => { void installLocalModel().catch(error => setStatus(error instanceof Error ? error.message : "Falha no download.")); }}><Text style={styles.buttonText}>Baixar modelo local</Text></Pressable> : null}{installing ? <Pressable accessibilityRole="button" style={styles.button} onPress={() => { void cancelModelDownload(); }}><Text style={styles.buttonText}>Cancelar download</Text></Pressable> : null}{status ? <Text accessibilityLiveRegion="polite" style={styles.hint}>{status}</Text> : null}</Card>;
}
const styles = StyleSheet.create({ title: { color: Colors.text, fontSize: 18, fontWeight: "700" }, row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.md }, copy: { flex: 1 }, label: { color: Colors.text, fontSize: 15, fontWeight: "600" }, hint: { color: Colors.subtitle, fontSize: 13, lineHeight: 19, marginTop: 4 }, button: { paddingVertical: 14, marginTop: 8 }, buttonText: { color: Colors.primary, fontWeight: "700" } });
