import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import api from "../../config/api";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function AutenticadorFinanceiro({ base, ativo, senhaAtual, onSenhaAtual, codigo, onCodigo, onAtivo, onAutorizado, onAutorizacaoPix }: {
  base: "/carteira" | "/comercial/financeiro";
  ativo: boolean;
  senhaAtual: string;
  onSenhaAtual?: (value: string) => void;
  codigo: string;
  onCodigo: (value: string) => void;
  onAtivo: () => void;
  onAutorizado?: (value: boolean) => void;
  onAutorizacaoPix?: (value: string) => void;
}) {
  const [segredo, setSegredo] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senhaConfirmada, setSenhaConfirmada] = useState(false);
  const [codigoConfirmado, setCodigoConfirmado] = useState(false);
  useEffect(() => { onAutorizacaoPix?.(""); }, [senhaAtual, codigo]);
  useEffect(() => { if (!senhaAtual || !codigo) { setCodigoConfirmado(false); onAutorizado?.(false); } }, [senhaAtual, codigo]);
  function alterarSenha(value: string) { onSenhaAtual?.(value); setSenhaConfirmada(false); setCodigoConfirmado(false); onAutorizado?.(false); onCodigo(""); }
  function alterarCodigo(value: string) { onCodigo(value.replace(/\D/g, "").slice(0, 6)); setCodigoConfirmado(false); onAutorizado?.(false); }
  async function confirmarSenha() {
    if (!senhaAtual) return Alert.alert("Confirme sua senha", "Digite a senha atual primeiro.");
    setOcupado(true);
    try {
      await api.post(`${base}/autenticador/confirmar-senha`, { senhaAtual });
      setSenhaConfirmada(true);
      Alert.alert("Senha confirmada", ativo ? "Agora informe o código de 6 dígitos do autenticador." : "Agora cadastre o aplicativo autenticador.");
    } catch (error: any) { Alert.alert("Senha não confirmada", error?.response?.data?.message ?? "Confira sua senha e tente novamente."); }
    finally { setOcupado(false); }
  }
  async function validarCodigo() {
    if (!senhaConfirmada) return Alert.alert("Confirme sua senha", "Confirme sua senha antes de validar o código.");
    if (codigo.length !== 6) return Alert.alert("Código incompleto", "Digite os 6 dígitos do aplicativo autenticador.");
    setOcupado(true);
    try {
      const { data } = await api.post(`${base}/autenticador/validar-codigo`, { senhaAtual, codigo });
      onAutorizacaoPix?.(String(data.autorizacaoPix ?? ""));
      setCodigoConfirmado(true); onAutorizado?.(true);
      Alert.alert("Código confirmado", data.autorizacaoPix ? "Você tem 5 minutos para validar o titular e salvar a chave Pix uma única vez. Transferências continuam exigindo um código atual." : "Agora conclua a operação desejada. Se o código mudar antes de salvar, informe o novo código e confirme novamente.");
    } catch (error: any) { Alert.alert("Código não confirmado", error?.response?.data?.message ?? "Confira o código e tente novamente."); }
    finally { setOcupado(false); }
  }
  async function copiarChave() {
    try {
      await Clipboard.setStringAsync(segredo);
      setCopiado(true);
    } catch {
      Alert.alert("Não foi possível copiar", "Toque e segure a chave para copiá-la manualmente.");
    }
  }
  async function iniciar() {
    if (!senhaConfirmada) return Alert.alert("Confirme sua senha", "Toque em Confirmar senha antes de cadastrar o autenticador.");
    setOcupado(true);
    try {
      const { data } = await api.post(`${base}/autenticador/iniciar`, { senhaAtual });
      setSegredo(String(data.segredo ?? ""));
      setCopiado(false);
    } catch (error: any) { Alert.alert("Autenticador", error?.response?.data?.message ?? "Não foi possível iniciar."); }
    finally { setOcupado(false); }
  }
  async function confirmar() {
    setOcupado(true);
    try {
      await api.post(`${base}/autenticador/confirmar`, { codigo });
      setSegredo(""); onCodigo(""); onAtivo();
      setSenhaConfirmada(false); onAutorizado?.(false);
      Alert.alert("Autenticador ativado", "As operações Pix agora exigem um código novo do aplicativo autenticador.");
    } catch (error: any) { Alert.alert("Código não confirmado", error?.response?.data?.message ?? "Confira o código e tente novamente."); }
    finally { setOcupado(false); }
  }
  return <View style={styles.box}>
    <Text style={styles.title}>Proteção das transferências</Text>
    <Text style={styles.help}>{ativo ? "Informe um código novo do seu aplicativo autenticador para cada alteração da chave Pix, da automação ou transferência." : "Antes de movimentar dinheiro, cadastre um aplicativo autenticador (como Google Authenticator ou Microsoft Authenticator). O código muda a cada 30 segundos."}</Text>
    {onSenhaAtual ? <><Text style={styles.label}>1. Confirme sua senha atual</Text><View style={styles.passwordField}><TextInput accessibilityLabel="Senha atual para segurança financeira" secureTextEntry={!mostrarSenha} autoCapitalize="none" value={senhaAtual} onChangeText={alterarSenha} placeholder="Sua senha atual" style={[styles.input, styles.passwordInput]} /><TouchableOpacity accessibilityRole="button" accessibilityLabel={mostrarSenha ? "Ocultar senha" : "Mostrar senha"} onPress={() => setMostrarSenha(!mostrarSenha)} style={styles.passwordEye}><Ionicons name={mostrarSenha ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.primary} /></TouchableOpacity></View><TouchableOpacity accessibilityRole="button" onPress={() => void confirmarSenha()} style={[styles.button, (!senhaAtual || ocupado) && styles.buttonInactive]}><Text style={styles.buttonText}>{ocupado ? "Confirmando..." : senhaConfirmada ? "Senha confirmada ✓" : "Confirmar senha"}</Text></TouchableOpacity></> : null}
    {!ativo && !segredo ? <TouchableOpacity accessibilityRole="button" onPress={() => void iniciar()} style={[styles.button, !senhaConfirmada && styles.buttonInactive]}><Text style={styles.buttonText}>2. Cadastrar autenticador</Text></TouchableOpacity> : null}
    {segredo ? <><Text style={styles.help}>No aplicativo autenticador, escolha adicionar conta manualmente e informe esta chave. Ela será mostrada apenas agora; não a compartilhe.</Text><View style={styles.secretBox}><Text selectable style={styles.secret}>{segredo}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel={copiado ? "Chave copiada para a área de transferência" : "Copiar chave do autenticador"} onPress={() => void copiarChave()} style={styles.copyButton}><Ionicons name={copiado ? "checkmark-circle-outline" : "copy-outline"} size={19} color={Colors.primary} /><Text style={styles.copyButtonText}>{copiado ? "Chave copiada" : "Copiar chave do autenticador"}</Text></TouchableOpacity>{copiado ? <Text accessibilityRole="alert" style={styles.help}>Agora cole a chave no aplicativo autenticador.</Text> : null}</> : null}
    {(ativo || segredo) && senhaConfirmada ? <><Text style={styles.label}>{segredo ? "3. Digite o código de 6 dígitos" : "2. Digite o código de 6 dígitos"}</Text><TextInput accessibilityLabel="Código do aplicativo autenticador" value={codigo} onChangeText={alterarCodigo} keyboardType="number-pad" maxLength={6} placeholder="000000" style={styles.input} />{segredo ? <TouchableOpacity accessibilityRole="button" onPress={() => codigo.length === 6 ? void confirmar() : Alert.alert("Código incompleto", "Digite os 6 dígitos para confirmar o autenticador.")} style={[styles.button, codigo.length !== 6 && styles.buttonInactive]}><Text style={styles.buttonText}>{ocupado ? "Confirmando..." : "4. Confirmar autenticador"}</Text></TouchableOpacity> : <TouchableOpacity accessibilityRole="button" onPress={() => void validarCodigo()} style={[styles.button, codigo.length !== 6 && styles.buttonInactive]}><Text style={styles.buttonText}>{codigoConfirmado ? "Código confirmado ✓" : "Confirmar código e liberar operações"}</Text></TouchableOpacity>}</> : null}
  </View>;
}

const styles = StyleSheet.create({
  passwordField: { position: "relative" },
  passwordInput: { paddingRight: 52 },
  passwordEye: { position: "absolute", right: 0, top: 0, bottom: 0, width: 48, alignItems: "center", justifyContent: "center" },
  box: { padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.surface },
  title: { color: Colors.text, fontSize: Typography.body, fontWeight: "800" },
  help: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 19 },
  label: { marginTop: Spacing.md, marginBottom: Spacing.xs, color: Colors.text, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, color: Colors.text },
  secretBox: { marginTop: Spacing.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: "#F4F8F6" },
  secret: { color: Colors.text, fontWeight: "800", letterSpacing: 1, textAlign: "center" },
  copyButton: { minHeight: 46, marginTop: Spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md },
  copyButtonText: { color: Colors.primary, fontWeight: "800" },
  button: { minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary },
  buttonInactive: { opacity: 0.45 },
  buttonText: { color: Colors.surface, fontWeight: "800" },
});
