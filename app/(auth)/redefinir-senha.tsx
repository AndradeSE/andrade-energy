import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ElasticScrollView as ScrollView } from "../../components/ui/ElasticScroll";
import { redefinirSenha } from "../../services/auth.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function RedefinirSenha() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mostrar, setMostrar] = useState(false);

  async function salvar() {
    if (!token) return setErro("Link de recuperação inválido.");
    if (senha.length < 6) return setErro("A senha deve ter pelo menos 6 caracteres.");
    if (senha !== confirmacao) return setErro("As senhas não coincidem.");
    setErro("");
    setSalvando(true);
    try {
      const resultado = await redefinirSenha(token, senha);
      Alert.alert("Senha alterada", resultado.message, [{ text: "Entrar", onPress: () => router.replace("/(auth)/login") }]);
    } catch (error: any) {
      setErro(error?.response?.data?.message ?? "Não foi possível redefinir a senha.");
    } finally {
      setSalvando(false);
    }
  }

  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.iconBox}><Ionicons name="lock-closed-outline" size={34} color={Colors.primary} /></View>
    <Text style={styles.title}>Criar nova senha</Text>
    <Text style={styles.subtitle}>Escolha uma nova senha para voltar a acessar sua conta.</Text>
    <Text style={styles.label}>Nova senha</Text>
    <View style={styles.inputBox}><Ionicons name="lock-closed-outline" size={20} color={Colors.subtitle} /><TextInput autoComplete="new-password" onChangeText={(v) => { setSenha(v); setErro(""); }} placeholder="Mínimo de 6 caracteres" placeholderTextColor="#92979F" secureTextEntry={!mostrar} style={styles.input} value={senha} /><TouchableOpacity onPress={() => setMostrar((v) => !v)}><Ionicons name={mostrar ? "eye-off-outline" : "eye-outline"} size={21} color={Colors.subtitle} /></TouchableOpacity></View>
    <Text style={[styles.label, { marginTop: Spacing.md }]}>Confirmar nova senha</Text>
    <View style={styles.inputBox}><Ionicons name="lock-closed-outline" size={20} color={Colors.subtitle} /><TextInput autoComplete="new-password" onChangeText={(v) => { setConfirmacao(v); setErro(""); }} onSubmitEditing={() => void salvar()} placeholder="Digite novamente" placeholderTextColor="#92979F" secureTextEntry={!mostrar} style={styles.input} value={confirmacao} /></View>
    {erro ? <Text style={styles.error}>{erro}</Text> : null}
    <TouchableOpacity disabled={salvando} onPress={() => void salvar()} style={[styles.primaryButton, salvando && { opacity: 0.7 }]}>{salvando ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.primaryText}>Salvar nova senha</Text>}</TouchableOpacity>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F5" }, flex: { flex: 1 }, content: { flexGrow: 1, justifyContent: "center", padding: Spacing.lg },
  iconBox: { width: 70, height: 70, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: Colors.primaryLight },
  title: { marginTop: Spacing.lg, color: Colors.text, fontSize: 28, fontWeight: "900" }, subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.xl, color: Colors.subtitle, fontSize: Typography.body, lineHeight: 23 },
  label: { marginBottom: 7, color: Colors.text, fontSize: Typography.small, fontWeight: "800" }, inputBox: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: "#C7CACD", borderRadius: Radius.md, backgroundColor: Colors.surface },
  input: { flex: 1, height: 52, marginLeft: Spacing.xs, color: Colors.text, fontSize: Typography.body }, error: { marginTop: Spacing.sm, color: Colors.danger, fontSize: Typography.small },
  primaryButton: { minHeight: 56, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primary }, primaryText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" },
});
