import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Radius, Spacing, Typography } from "../../theme";
import { criarConta } from "../../services/auth.service";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { consultarConvite } from "../../services/convites.service";

export default function CriarConta() {
  const tipo: "CONSUMIDOR" | "GERADOR" = IS_GERADOR_APP ? "GERADOR" : "CONSUMIDOR";
  const params = useLocalSearchParams<{ convite?: string }>();
  const [convite, setConvite] = useState(params.convite ?? "");
  const [conviteValido, setConviteValido] = useState(IS_GERADOR_APP);
  const [validandoConvite, setValidandoConvite] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [solicitado, setSolicitado] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState(false);

  async function validarConvite() {
    if (!convite.trim()) return setErro("Informe o código recebido no convite.");
    try {
      setValidandoConvite(true);
      setErro("");
      const dados = await consultarConvite(convite.trim());
      setNome(dados.nome);
      setCpf(dados.cpf);
      setEmail(dados.email);
      setConviteValido(true);
    } catch (error: any) {
      setErro(error?.response?.data?.message ?? "Convite inválido ou expirado.");
    } finally {
      setValidandoConvite(false);
    }
  }

  async function solicitarAcesso() {
    if (salvando) return;
    if (!nome.trim()) return setErro("Informe seu nome.");
    if (cpf.replace(/\D/g, "").length !== 11) return setErro("Informe um CPF válido com 11 números.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro("Informe um e-mail válido.");
    if (senha.length < 6) return setErro("Crie uma senha com pelo menos 6 caracteres.");
    if (senha !== confirmacao) return setErro("As senhas não são iguais.");
    setErro("");
    try {
      setSalvando(true);
      const resultado = await criarConta({ nome: nome.trim(), cpf, email: email.trim().toLowerCase(), senha, tipo, convite: convite.trim() || undefined });
      setEmailEnviado(Boolean(resultado?.emailEnviado));
      setSolicitado(true);
    } catch (error: any) {
      Alert.alert("Não foi possível criar a conta", error?.response?.data?.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (!IS_GERADOR_APP && !conviteValido) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.inviteContent}>
          <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={23} color={Colors.text} /></TouchableOpacity>
          <View style={styles.iconBox}><Ionicons name="mail-outline" size={34} color={Colors.primary} /></View>
          <Text style={styles.title}>Acessar convite</Text>
          <Text style={styles.subtitle}>O cadastro do consumidor é liberado pelo gerador. Cole abaixo o código recebido por e-mail.</Text>
          <Text style={styles.label}>Código do convite</Text>
          <View style={styles.inputBox}><TextInput autoCapitalize="none" onChangeText={(valor) => { setConvite(valor); setErro(""); }} placeholder="Cole o código aqui" placeholderTextColor="#92979F" style={styles.inputWithoutIcon} value={convite} /></View>
          {erro ? <Text style={styles.error}>{erro}</Text> : null}
          <TouchableOpacity disabled={validandoConvite} onPress={validarConvite} style={[styles.primaryButton, validandoConvite && { opacity: 0.7 }]}>{validandoConvite ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.primaryText}>Continuar cadastro</Text>}</TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={23} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.iconBox}><Ionicons name={solicitado ? "checkmark" : "person-add-outline"} size={34} color={Colors.primary} /></View>
          <Text style={styles.title}>{solicitado ? "Conta criada" : `Cadastro de ${tipo === "GERADOR" ? "gerador" : "consumidor"}`}</Text>
          <Text style={styles.subtitle}>
            {solicitado
              ? emailEnviado
                ? "Sua conta está pronta. Enviamos a confirmação para o e-mail informado."
                : "Sua conta está pronta, mas não conseguimos enviar o e-mail de confirmação. Você já pode entrar normalmente."
              : "Solicite seu acesso à Andrade Energy. Seus dados serão vinculados à unidade consumidora cadastrada."}
          </Text>

          {!solicitado ? (
            <>
              <Text style={styles.label}>Nome completo</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={20} color={Colors.subtitle} />
                <TextInput autoCapitalize="words" editable={IS_GERADOR_APP} onChangeText={(valor) => { setNome(valor); setErro(""); }} placeholder="Seu nome" placeholderTextColor="#92979F" style={styles.input} value={nome} />
              </View>
              <Text style={styles.label}>CPF</Text>
              <View style={styles.inputBox}>
                <TextInput
                  editable={IS_GERADOR_APP}
                  keyboardType="numeric"
                  maxLength={11}
                  onChangeText={(valor) => { setCpf(valor.replace(/\D/g, "")); setErro(""); }}
                  placeholder="Somente números"
                  placeholderTextColor="#92979F"
                  style={styles.inputWithoutIcon}
                  value={cpf}
                />
              </View>
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color={Colors.subtitle} />
                <TextInput autoCapitalize="none" autoComplete="email" editable={IS_GERADOR_APP} keyboardType="email-address" onChangeText={(valor) => { setEmail(valor); setErro(""); }} onSubmitEditing={solicitarAcesso} placeholder="seu@email.com" placeholderTextColor="#92979F" returnKeyType="send" style={styles.input} value={email} />
              </View>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputBox}><Ionicons name="lock-closed-outline" size={20} color={Colors.subtitle} /><TextInput onChangeText={(valor) => { setSenha(valor); setErro(""); }} placeholder="Mínimo de 6 caracteres" placeholderTextColor="#92979F" secureTextEntry style={styles.input} value={senha} /></View>
              <Text style={styles.label}>Confirmar senha</Text>
              <View style={styles.inputBox}><Ionicons name="lock-closed-outline" size={20} color={Colors.subtitle} /><TextInput onChangeText={(valor) => { setConfirmacao(valor); setErro(""); }} onSubmitEditing={solicitarAcesso} placeholder="Digite a senha novamente" placeholderTextColor="#92979F" secureTextEntry style={styles.input} value={confirmacao} /></View>
              {erro ? <Text style={styles.error}>{erro}</Text> : null}
              <TouchableOpacity disabled={salvando} onPress={solicitarAcesso} style={[styles.primaryButton, salvando && { opacity: 0.7 }]}>{salvando ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.primaryText}>Criar minha conta</Text>}</TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.primaryButton}><Text style={styles.primaryText}>Voltar para o login</Text></TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F5" }, flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: Spacing.lg },
  inviteContent: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  back: { position: "absolute", top: Spacing.lg, left: Spacing.lg, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#DEE0E3" },
  iconBox: { width: 70, height: 70, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#DEE0E3" },
  title: { marginTop: Spacing.lg, color: Colors.text, fontSize: 28, fontWeight: "900" },
  subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.xl, color: Colors.subtitle, fontSize: Typography.body, lineHeight: 23 },
  label: { marginTop: Spacing.sm, marginBottom: 7, color: Colors.text, fontSize: Typography.small, fontWeight: "800" },
  inputBox: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: "#C7CACD", borderRadius: Radius.md, backgroundColor: Colors.surface },
  input: { flex: 1, height: 52, marginLeft: Spacing.xs, color: Colors.text, fontSize: Typography.body },
  inputWithoutIcon: { flex: 1, height: 52, color: Colors.text, fontSize: Typography.body },
  error: { marginTop: Spacing.sm, color: Colors.danger, fontSize: Typography.small },
  primaryButton: { minHeight: 56, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primary },
  primaryText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" },
});
