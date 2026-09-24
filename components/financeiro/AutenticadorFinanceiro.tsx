import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import api from "../../config/api";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function AutenticadorFinanceiro({ base, ativo, senhaAtual, codigo, onCodigo, onAtivo }: {
  base: "/carteira" | "/comercial/financeiro";
  ativo: boolean;
  senhaAtual: string;
  codigo: string;
  onCodigo: (value: string) => void;
  onAtivo: () => void;
}) {
  const [segredo, setSegredo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  async function iniciar() {
    if (!senhaAtual) return Alert.alert("Confirme sua senha", "Informe sua senha atual antes de cadastrar o autenticador.");
    setOcupado(true);
    try {
      const { data } = await api.post(`${base}/autenticador/iniciar`, { senhaAtual });
      setSegredo(String(data.segredo ?? ""));
    } catch (error: any) { Alert.alert("Autenticador", error?.response?.data?.message ?? "Não foi possível iniciar."); }
    finally { setOcupado(false); }
  }
  async function confirmar() {
    setOcupado(true);
    try {
      await api.post(`${base}/autenticador/confirmar`, { codigo });
      setSegredo(""); onCodigo(""); onAtivo();
      Alert.alert("Autenticador ativado", "As operações Pix agora exigem um código novo do aplicativo autenticador.");
    } catch (error: any) { Alert.alert("Código não confirmado", error?.response?.data?.message ?? "Confira o código e tente novamente."); }
    finally { setOcupado(false); }
  }
  return <View style={styles.box}>
    <Text style={styles.title}>Proteção das transferências</Text>
    <Text style={styles.help}>{ativo ? "Informe um código novo do seu aplicativo autenticador para cada alteração da chave Pix, da automação ou transferência." : "Antes de movimentar dinheiro, cadastre um aplicativo autenticador (como Google Authenticator ou Microsoft Authenticator). O código muda a cada 30 segundos."}</Text>
    {!ativo && !segredo ? <TouchableOpacity accessibilityRole="button" disabled={ocupado} onPress={() => void iniciar()} style={styles.button}><Text style={styles.buttonText}>{ocupado ? "Preparando..." : "Cadastrar autenticador"}</Text></TouchableOpacity> : null}
    {segredo ? <><Text style={styles.help}>No aplicativo autenticador, escolha adicionar conta manualmente e informe esta chave. Ela será mostrada apenas agora; não a compartilhe.</Text><TouchableOpacity accessibilityRole="button" onPress={() => void Clipboard.setStringAsync(segredo)}><Text selectable style={styles.secret}>{segredo}  ·  Copiar</Text></TouchableOpacity></> : null}
    {(ativo || segredo) ? <><Text style={styles.label}>Código de 6 dígitos</Text><TextInput accessibilityLabel="Código do aplicativo autenticador" value={codigo} onChangeText={value => onCodigo(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="000000" style={styles.input} />{segredo ? <TouchableOpacity accessibilityRole="button" disabled={ocupado || codigo.length !== 6} onPress={() => void confirmar()} style={styles.button}><Text style={styles.buttonText}>{ocupado ? "Confirmando..." : "Confirmar autenticador"}</Text></TouchableOpacity> : null}</> : null}
  </View>;
}

const styles = StyleSheet.create({
  box: { padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  title: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
  help: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 },
  label: { marginTop: Spacing.md, marginBottom: Spacing.xs, color: Colors.text, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, color: Colors.text },
  secret: { marginTop: Spacing.sm, color: Colors.primary, fontWeight: "800", letterSpacing: 1 },
  button: { minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary },
  buttonText: { color: Colors.surface, fontWeight: "800" },
});
