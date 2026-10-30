import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import api from "../../config/api";
import { Colors, Radius, Spacing } from "../../theme";

export default function RecuperarAutenticador({ base, senhaAtual, senhaConfirmada, onConcluido, onExpandir }: {
  base: string; senhaAtual: string; senhaConfirmada: boolean; onConcluido: () => void; onExpandir: (aberto: boolean) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [solicitacaoId, setSolicitacao] = useState("");
  const [email, setEmail] = useState("");
  const [codigoEmail, setCodigo] = useState("");
  async function solicitar() {
    if (ocupado || !senhaConfirmada) return;
    setOcupado(true);
    try {
      const { data } = await api.post(`${base}/autenticador/recuperacao/solicitar`, { senhaAtual });
      setSolicitacao(data.solicitacaoId); setEmail(data.emailMascarado); setCodigo("");
    } catch (error: any) { Alert.alert("Recuperação", error?.response?.data?.message ?? "Não foi possível enviar o código."); }
    finally { setOcupado(false); }
  }
  async function confirmar() {
    if (ocupado || codigoEmail.length !== 8 || !senhaConfirmada) return;
    setOcupado(true);
    try {
      const { data } = await api.post(`${base}/autenticador/recuperacao/confirmar`, { senhaAtual, solicitacaoId, codigoEmail });
      setCodigo(""); setSolicitacao(""); onConcluido();
      Alert.alert("Recuperação confirmada", `Cadastre e confirme um novo autenticador para liberar as operações protegidas.${data.avisoEnviado ? " Enviamos um aviso ao seu e-mail." : " O aviso por e-mail não pôde ser enviado; a recuperação foi registrada."}`);
    } catch (error: any) { Alert.alert("Recuperação não confirmada", error?.response?.data?.message ?? "Confira o código e tente novamente."); }
    finally { setOcupado(false); }
  }
  return <View style={styles.box}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Recuperar autenticador perdido" disabled={ocupado} onPress={() => { setAberto(!aberto); onExpandir(!aberto); }} style={styles.link}><Text style={styles.linkText}>{aberto ? "Voltar ao autenticador" : "Perdi meu autenticador"}</Text></TouchableOpacity>
    {aberto ? <><Text style={styles.help}>Confirme sua senha acima e receba um código no e-mail da própria conta. O autenticador atual só será desativado após essa confirmação; depois, será obrigatório cadastrar um novo.</Text>
      <TouchableOpacity accessibilityRole="button" disabled={ocupado || !senhaConfirmada} onPress={() => void solicitar()} style={[styles.button, (ocupado || !senhaConfirmada) && styles.disabled]}><Text style={styles.buttonText}>{ocupado ? "Aguarde..." : solicitacaoId ? "Reenviar código de recuperação" : "Enviar código de recuperação"}</Text></TouchableOpacity>
      {solicitacaoId ? <><Text style={styles.help}>Código enviado para {email}. Válido por 10 minutos, com até 5 tentativas. Um reenvio invalida o código anterior.</Text><TextInput accessibilityLabel="Código de recuperação do autenticador recebido por e-mail" keyboardType="number-pad" secureTextEntry autoComplete="off" value={codigoEmail} onChangeText={value => setCodigo(value.replace(/\D/g, "").slice(0, 8))} maxLength={8} style={styles.input} placeholder="8 dígitos do e-mail" placeholderTextColor={Colors.subtitle} />
        <TouchableOpacity accessibilityRole="button" disabled={ocupado || !senhaConfirmada || codigoEmail.length !== 8} onPress={() => Alert.alert("Redefinir autenticador?", "O autenticador anterior deixará de funcionar. As operações protegidas ficarão bloqueadas até cadastrar e confirmar um novo.", [{ text: "Voltar", style: "cancel" }, { text: "Confirmar recuperação", onPress: () => void confirmar() }])} style={[styles.button, (ocupado || !senhaConfirmada || codigoEmail.length !== 8) && styles.disabled]}><Text style={styles.buttonText}>Confirmar recuperação do autenticador</Text></TouchableOpacity></> : null}
    </> : null}
  </View>;
}
const styles = StyleSheet.create({
  box: { marginTop: Spacing.sm }, link: { minHeight: 46, justifyContent: "center" },
  linkText: { color: Colors.primary, fontWeight: "700" }, help: { color: Colors.subtitle, lineHeight: 20, marginVertical: Spacing.sm },
  button: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.sm, minHeight: 46, justifyContent: "center", alignItems: "center", marginTop: Spacing.sm },
  buttonText: { color: Colors.surface, fontWeight: "700", textAlign: "center" }, disabled: { opacity: .45 },
  input: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, color: Colors.text },
});
