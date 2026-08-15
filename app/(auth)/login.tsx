import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../contexts/AuthContext";
import { login } from "../../services/auth.service";
import { APP_DISPLAY_NAME, IS_GERADOR_APP } from "../../config/appVariant";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function Login() {
  const { login: salvarSessao } = useAuth();
  const senhaRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroEmail, setErroEmail] = useState("");
  const [erroSenha, setErroSenha] = useState("");

  async function entrar() {
    if (loading) return;

    const emailNormalizado = email.trim().toLowerCase();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado);
    setErroEmail(emailValido ? "" : "Informe um e-mail válido.");
    setErroSenha(senha ? "" : "Informe sua senha.");
    if (!emailValido || !senha) return;

    try {
      setLoading(true);
      const resposta = await login(emailNormalizado, senha);
      const perfilGestor = resposta.usuario?.perfil === "ADMIN" || resposta.usuario?.perfil === "GESTOR";
      if (IS_GERADOR_APP !== perfilGestor) {
        throw new Error(IS_GERADOR_APP ? "Esta conta pertence ao aplicativo do consumidor." : "Esta conta pertence ao aplicativo do gerador.");
      }
      await salvarSessao(resposta.token, resposta.usuario);
      router.replace("/selecionar-unidade");
    } catch (erro: any) {
      Alert.alert(
        "Não foi possível entrar",
        erro?.response?.data?.message ?? erro?.message ?? "Confira seu e-mail, sua senha e tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar backgroundColor="#8F938D" barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandArea}>
            <View style={styles.logoBox}>
              <Image source={require("../../assets/images/icon.png")} style={styles.logo} />
            </View>
            <Text style={styles.brand}>{APP_DISPLAY_NAME}</Text>
            <Text style={styles.brandSubtitle}>Energia inteligente, simples e transparente.</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.eyebrow}>ÁREA DO CLIENTE</Text>
            <Text style={styles.title}>Bem-vindo</Text>
            <Text style={styles.subtitle}>Entre para acompanhar sua economia, faturas e contratos.</Text>

            <Text style={styles.label}>E-mail</Text>
            <View style={[styles.inputContainer, Boolean(erroEmail) && styles.inputError]}>
              <Ionicons name="mail-outline" size={20} color={Colors.subtitle} />
              <TextInput
                accessibilityLabel="E-mail"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={(valor) => { setEmail(valor); if (erroEmail) setErroEmail(""); }}
                onSubmitEditing={() => senhaRef.current?.focus()}
                placeholder="seu@email.com"
                placeholderTextColor="#92979F"
                returnKeyType="next"
                style={styles.input}
                value={email}
              />
            </View>
            {erroEmail ? <Text style={styles.errorText}>{erroEmail}</Text> : null}

            <Text style={styles.label}>Senha</Text>
            <View style={[styles.inputContainer, Boolean(erroSenha) && styles.inputError]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.subtitle} />
              <TextInput
                ref={senhaRef}
                accessibilityLabel="Senha"
                autoCapitalize="none"
                autoComplete="current-password"
                onChangeText={(valor) => { setSenha(valor); if (erroSenha) setErroSenha(""); }}
                onSubmitEditing={entrar}
                placeholder="Digite sua senha"
                placeholderTextColor="#92979F"
                returnKeyType="done"
                secureTextEntry={!mostrarSenha}
                style={styles.input}
                value={senha}
              />
              <TouchableOpacity accessibilityLabel={mostrarSenha ? "Ocultar senha" : "Mostrar senha"} onPress={() => setMostrarSenha((atual) => !atual)} style={styles.eyeButton}>
                <Ionicons name={mostrarSenha ? "eye-off-outline" : "eye-outline"} size={21} color={Colors.subtitle} />
              </TouchableOpacity>
            </View>
            {erroSenha ? <Text style={styles.errorText}>{erroSenha}</Text> : null}

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/(auth)/esqueci-senha")}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.84} disabled={loading} onPress={entrar} style={[styles.loginButton, loading && styles.loginButtonDisabled]}>
              {loading ? <ActivityIndicator color={Colors.surface} /> : <><Text style={styles.loginText}>Entrar</Text><Ionicons name="arrow-forward" size={20} color={Colors.surface} /></>}
            </TouchableOpacity>

            <View style={styles.securityRow}>
              <Ionicons name="shield-checkmark-outline" size={17} color={Colors.primary} />
              <Text style={styles.securityText}>Acesso protegido aos seus dados de energia</Text>
            </View>

            <View style={styles.createAccountRow}>
              <Text style={styles.createAccountLabel}>Ainda não tem acesso?</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(auth)/criar-conta")}>
                <Text style={styles.createAccountText}>Criar conta</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footer}>© 2026 Andrade Energy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#8F938D" },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, backgroundColor: "#F5F6F5" },
  brandArea: { alignItems: "center", marginBottom: Spacing.xl },
  logoBox: { width: 84, height: 84, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 24, backgroundColor: Colors.surface, shadowColor: "#000", shadowOpacity: 0.09, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  logo: { width: 72, height: 72, resizeMode: "contain" },
  brand: { marginTop: Spacing.md, color: Colors.text, fontSize: 27, fontWeight: "900" },
  brandSubtitle: { marginTop: 5, color: Colors.subtitle, fontSize: Typography.caption, textAlign: "center" },
  formCard: { padding: Spacing.lg, borderRadius: Radius.xl, backgroundColor: "#DEE0E3", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 4, color: Colors.text, fontSize: Typography.section, fontWeight: "900" },
  subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.subtitle, fontSize: Typography.caption, lineHeight: 20 },
  label: { marginTop: Spacing.sm, marginBottom: 6, color: Colors.text, fontSize: Typography.small, fontWeight: "800" },
  inputContainer: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: "#C7CACD", borderRadius: Radius.md, backgroundColor: Colors.surface },
  inputError: { borderColor: Colors.danger },
  input: { flex: 1, height: 52, marginLeft: Spacing.xs, color: Colors.text, fontSize: Typography.body },
  eyeButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  errorText: { marginTop: 5, color: Colors.danger, fontSize: Typography.small },
  forgotButton: { alignSelf: "flex-end", paddingVertical: Spacing.sm },
  forgotText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" },
  loginButton: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primary },
  loginButtonDisabled: { opacity: 0.7 },
  loginText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" },
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  securityText: { marginLeft: 6, color: Colors.subtitle, fontSize: 11 },
  createAccountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: "#C7CACD" },
  createAccountLabel: { color: Colors.subtitle, fontSize: Typography.small },
  createAccountText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "900" },
  footer: { marginTop: Spacing.lg, color: Colors.subtitle, fontSize: Typography.small, textAlign: "center" },
});
