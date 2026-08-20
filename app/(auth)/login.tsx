import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
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
import { ativarDigital, autenticarComDigital, verificarDigitalDisponivel } from "../../services/biometric.service";
import { APP_DISPLAY_NAME, IS_GERADOR_APP } from "../../config/appVariant";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function Login() {
  const { login: salvarSessao, refreshDigitalStatus } = useAuth();
  const senhaRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erroEmail, setErroEmail] = useState("");
  const [erroSenha, setErroSenha] = useState("");

  async function entrar(ativarBiometria = false) {
    if (loading) return;

    const emailNormalizado = email.trim().toLowerCase();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado);
    setErroEmail(emailValido ? "" : "Informe um e-mail válido.");
    setErroSenha(senha ? "" : "Informe sua senha.");
    if (!emailValido || !senha) return;

    try {
      setLoading(true);
      const resposta = await login(emailNormalizado, senha, IS_GERADOR_APP ? "GERADOR" : "CONSUMIDOR");
      await salvarSessao(resposta.token, resposta.usuario);
      if (ativarBiometria) {
        const disponivel = await verificarDigitalDisponivel();
        if (!disponivel) {
          Alert.alert("Biometria indisponível", "Cadastre uma impressão digital ou rosto nas configurações do aparelho e tente novamente.");
        } else {
          const resultado = await autenticarComDigital();
          if (resultado.success && resposta.usuario?.id) {
            await ativarDigital(resposta.usuario?.id);
            await refreshDigitalStatus();
            Alert.alert("Biometria ativada", "Nos próximos acessos, você poderá entrar usando a biometria do aparelho.");
          } else if (resultado.success) {
            Alert.alert("Não foi possível ativar", "Não identificamos sua conta para salvar a preferência de biometria.");
          }
        }
      }
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
      <StatusBar backgroundColor="#006B3C" barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboard}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <ImageBackground
            resizeMode="cover"
            source={require("../../assets/images/login-solar-header.png")}
            style={styles.brandArea}
          >
            <View style={styles.logoPanel}>
              <Image source={require("../../assets/images/andrade-logo-horizontal.png")} style={styles.brandLogo} />
            </View>
            <Text style={styles.appName}>{APP_DISPLAY_NAME}</Text>
            <Text style={styles.brandSubtitle}>Energia inteligente, simples e transparente</Text>
          </ImageBackground>

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
                onSubmitEditing={() => void entrar()}
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

            <View style={styles.accessActions}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.push("/(auth)/esqueci-senha")}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Esqueceu sua senha?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.75}
                disabled={loading}
                onPress={() => entrar(true)}
                style={styles.biometricLink}
              >
                <Ionicons name="finger-print-outline" size={17} color={Colors.primary} />
                <Text style={styles.biometricLinkText}>Ativar biometria</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.84} disabled={loading} onPress={() => void entrar()} style={[styles.loginButton, loading && styles.loginButtonDisabled]}>
              {loading ? <ActivityIndicator color={Colors.surface} /> : <><Text style={styles.loginText}>Entrar</Text><Ionicons name="arrow-forward" size={20} color={Colors.surface} /></>}
            </TouchableOpacity>

            <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={() => router.push("/(auth)/criar-conta")} style={styles.createAccountButton}>
              <Ionicons name={IS_GERADOR_APP ? "person-add-outline" : "mail-open-outline"} size={20} color={Colors.primary} />
              <Text style={styles.createAccountButtonText}>{IS_GERADOR_APP ? "Criar conta" : "Aceitar convite e criar conta"}</Text>
            </TouchableOpacity>

            <View style={styles.securityRow}>
              <Ionicons name="shield-checkmark-outline" size={17} color={Colors.primary} />
              <Text style={styles.securityText}>Acesso protegido aos seus dados de energia</Text>
            </View>
          </View>

          <Text style={styles.footer}>© 2026 Andrade Energy</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F5" },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, backgroundColor: "#F5F6F5" },
  brandArea: { alignItems: "center", marginHorizontal: -Spacing.lg, marginBottom: Spacing.xl, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xl, overflow: "hidden", backgroundColor: "#F5F6F5" },
  logoPanel: { width: "112%", maxWidth: 430, height: 166, alignItems: "center", justifyContent: "center" },
  brandLogo: { width: "100%", height: 154, resizeMode: "contain" },
  appName: { marginTop: Spacing.md, color: Colors.surface, fontSize: Typography.body, fontWeight: "900" },
  brandSubtitle: { marginTop: 4, color: "rgba(255,255,255,0.78)", fontSize: Typography.small, textAlign: "center" },
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
  accessActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  forgotButton: { paddingVertical: Spacing.sm },
  forgotText: { color: Colors.primary, fontSize: Typography.small, fontWeight: "800" },
  biometricLink: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: Spacing.sm },
  biometricLinkText: { color: Colors.primary, fontSize: 11, fontWeight: "800" },
  loginButton: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primary },
  loginButtonDisabled: { opacity: 0.7 },
  loginText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" },
  createAccountButton: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.sm, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, backgroundColor: "rgba(255,255,255,0.45)" },
  createAccountButtonText: { color: Colors.primary, fontSize: Typography.body, fontWeight: "900" },
  securityRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: Spacing.md },
  securityText: { marginLeft: 6, color: Colors.subtitle, fontSize: 11 },
  footer: { marginTop: Spacing.lg, color: Colors.subtitle, fontSize: Typography.small, textAlign: "center" },
});
