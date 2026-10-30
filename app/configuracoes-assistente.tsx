import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Switch } from "../components/assistant/AssistantNativeControls";
import { AppHeader, Card, Screen } from "../components/ui";
import AssistantVoiceMenu from "../components/assistant/AssistantVoiceMenu";
import AssistantLocalModelSettings from "../components/assistant/AssistantLocalModelSettings";
import { useAuth } from "../contexts/AuthContext";
import { accountVoiceConsent, onlineAudioConsent, geminiLiveAudioConsent, setAccountVoiceConsent, setOnlineAudioConsent, setGeminiLiveAudioConsent } from "../services/assistant-voice-consent";
import { floatingHidden, loadFloatingPreference, setFloatingHidden } from "../services/assistant-floating-preference";
import { closeFloatingConversation } from "../services/assistant-floating-conversation";
import { Colors, Spacing } from "../theme";

type Option = "floating" | "account" | "dictation" | "live";
export default function AssistantSettings() {
  const { usuario } = useAuth();
  const userId = String(usuario?.id ?? "");
  const [values, setValues] = useState<Record<Option, boolean>>({ floating: true, account: false, dictation: false, live: false });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([loadFloatingPreference(userId), accountVoiceConsent(userId), onlineAudioConsent(userId), geminiLiveAudioConsent(userId)]).then(([, account, dictation, live]) => { if (active) setValues({ floating: !floatingHidden(), account, dictation, live }); }).catch(() => { if (active) setError("Não foi possível carregar as preferências. Reabra esta tela para tentar novamente."); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [userId]);
  async function save(option: Option, value: boolean) {
    setBusy(true);
    try {
      const setters = { floating: (id: string, allowed: boolean) => setFloatingHidden(id, !allowed), account: setAccountVoiceConsent, dictation: setOnlineAudioConsent, live: setGeminiLiveAudioConsent };
      await setters[option](userId, value);
      if (!value && option !== "floating") closeFloatingConversation();
      setValues(current => ({ ...current, [option]: value }));
    } catch { Alert.alert("Não foi possível salvar", "Tente novamente."); }
    finally { setBusy(false); }
  }
  function change(option: Option, value: boolean) {
    if (busy || error || !userId) return;
    if (!value || option === "floating") { void save(option, value); return; }
    const notices = {
      account: "O texto das respostas com dados da sua conta será enviado ao Google Gemini e, se necessário, à Microsoft Azure para gerar a voz. Não enviaremos PDFs, senhas nem códigos. Evite usar quando outras pessoas puderem ouvir dados pessoais.",
      dictation: "A gravação ditada será enviada ao serviço de transcrição online. Não dite senhas nem códigos de acesso.",
      live: "Na conversa por voz, o áudio será enviado ao Gemini Live. Não fale senhas nem códigos de acesso. Você poderá revogar esta autorização aqui.",
    };
    Alert.alert("Autorizar recurso de voz", notices[option], [{ text: "Cancelar", style: "cancel" }, { text: "Autorizar", onPress: () => { void save(option, true); } }]);
  }
  const options: Array<{ key: Option; title: string; description: string }> = [
    { key: "floating", title: "Mostrar Solar na tela", description: "Exibe o botão flutuante para abrir o assistente." },
    { key: "account", title: "Ler dados da conta por voz", description: "Permite respostas faladas com informações da sua conta." },
    { key: "dictation", title: "Transcrição online", description: "Permite enviar a gravação ditada para transcrição." },
    { key: "live", title: "Conversa por voz", description: "Autoriza o envio de áudio ao Gemini Live durante a conversa." },
  ];
  return <Screen><AppHeader title="Configurações da Solar" subtitle="Preferências do assistente" contextTitle="Assistente Solar" contextSubtitle="Voz, ativação e aparência" showPlantSwitch={false} /><ScrollView contentContainerStyle={styles.content}><Card><Text style={styles.title}>Ativação e aparência</Text>{userId ? <AssistantVoiceMenu userId={userId} /> : null}{options.map(option => <View key={option.key} style={styles.row}><View style={styles.copy}><Text style={styles.label}>{option.title}</Text><Text style={styles.hint}>{option.description}</Text></View><Switch accessibilityLabel={option.title} disabled={busy || Boolean(error) || !userId} value={values[option.key]} onValueChange={value => change(option.key, value)} trackColor={{ true: Colors.primary }} /></View>)}</Card><AssistantLocalModelSettings userId={userId} /><Text style={styles.hint}>{error || "As preferências são salvas para sua conta neste aparelho. Desativar o início por voz mantém o acesso manual à Solar. A escuta é interrompida quando o app vai para segundo plano."}</Text></ScrollView></Screen>;
}
const styles = StyleSheet.create({ content: { padding: Spacing.md, gap: Spacing.md }, title: { fontSize: 18, fontWeight: "700", color: Colors.text }, row: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border }, copy: { flex: 1 }, label: { fontSize: 15, fontWeight: "600", color: Colors.text }, hint: { color: Colors.subtitle, fontSize: 13, lineHeight: 19, marginTop: 4 } });
