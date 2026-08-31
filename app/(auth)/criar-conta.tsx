import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ElasticScrollView as ScrollView } from "../../components/ui/ElasticScroll";
import { Colors, Radius, Spacing, Typography } from "../../theme";
import { criarConta, criarContaConsumidorComFatura, reenviarVerificacaoDeCadastro } from "../../services/auth.service";
import { IS_GERADOR_APP } from "../../config/appVariant";
import { consultarConvite, consultarConviteGerador } from "../../services/convites.service";

export default function CriarConta() {
  const tipo: "CONSUMIDOR" | "GERADOR" = IS_GERADOR_APP ? "GERADOR" : "CONSUMIDOR";
  const params = useLocalSearchParams<{ convite?: string }>();
  const [convite, setConvite] = useState(params.convite ?? "");
  const [conviteValido, setConviteValido] = useState(false);
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
  const [fatura, setFatura] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [reenviando, setReenviando] = useState(false);

  async function validarConvite() {
    if (!convite.trim()) return setErro("Informe o código recebido no convite.");
    try {
      setValidandoConvite(true);
      setErro("");
      const dados = IS_GERADOR_APP ? await consultarConviteGerador(convite.trim()) : await consultarConvite(convite.trim());
      setNome(dados.nome);
      // No consumidor o CPF é digitado novamente: ele abre a fatura CEMIG
      // protegida e confirma que os dados exibidos pertencem ao titular.
      setCpf(IS_GERADOR_APP ? dados.cpf : "");
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
    if (tipo === "CONSUMIDOR" && !fatura) return setErro("Envie a sua fatura CEMIG em PDF.");
    setErro("");
    try {
      setSalvando(true);
      const resultado = tipo === "CONSUMIDOR"
        ? await criarContaConsumidorComFatura({
          convite: convite.trim(),
          cpf,
          senha,
          fatura: { uri: fatura!.uri, name: fatura!.name, mimeType: fatura!.mimeType },
        })
        : await criarConta({ nome: nome.trim(), cpf, email: email.trim().toLowerCase(), senha, tipo, convite: convite.trim() || undefined });
      setEmailEnviado(Boolean(resultado?.emailEnviado));
      setSolicitado(true);
    } catch (error: any) {
      Alert.alert("Não foi possível criar a conta", error?.response?.data?.message ?? "Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function escolherFatura() {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!resultado.canceled) {
        setFatura(resultado.assets[0]);
        setErro("");
      }
    } catch {
      setErro("Não foi possível selecionar a fatura. Tente novamente.");
    }
  }

  async function reenviarConfirmacao() {
    if (reenviando) return;
    try {
      setReenviando(true);
      const resultado = await reenviarVerificacaoDeCadastro(email);
      Alert.alert("Confirmação enviada", resultado.emailEnviado ? "Enviamos um novo link de confirmação para o seu e-mail." : resultado.message);
    } catch (error: any) {
      Alert.alert("Não foi possível reenviar", error?.response?.data?.message ?? "Tente novamente em alguns instantes.");
    } finally {
      setReenviando(false);
    }
  }

  if (!conviteValido) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.inviteContent}>
          <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={23} color={Colors.text} /></TouchableOpacity>
          <View style={styles.iconBox}><Ionicons name="mail-outline" size={34} color={Colors.primary} /></View>
          <Text style={styles.title}>Acessar convite</Text>
          <Text style={styles.subtitle}>{IS_GERADOR_APP ? "O cadastro de geradores é liberado somente pela conta administradora. Cole abaixo o código recebido por e-mail." : "O cadastro do consumidor é liberado pelo gerador. Cole abaixo o código recebido por e-mail."}</Text>
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

          <View style={styles.iconBox}><Ionicons name={solicitado ? (tipo === "CONSUMIDOR" ? "mail-unread-outline" : "checkmark") : "person-add-outline"} size={34} color={Colors.primary} /></View>
          <Text style={styles.title}>{solicitado ? (tipo === "CONSUMIDOR" ? "Confirme seu e-mail" : "Conta criada") : `Cadastro de ${tipo === "GERADOR" ? "gerador" : "consumidor"}`}</Text>
          <Text style={styles.subtitle}>
            {solicitado
              ? tipo === "CONSUMIDOR"
                ? emailEnviado
                  ? "Enviamos um link para confirmar o seu e-mail. Depois disso, o gerador conferirá a fatura e liberará seu acesso."
                  : "O cadastro foi recebido, mas o e-mail não saiu agora. Use o botão abaixo para enviar um novo link de confirmação."
                : emailEnviado
                  ? "Sua conta está pronta. Enviamos a confirmação para o e-mail informado."
                  : "Sua conta está pronta, mas não conseguimos enviar o e-mail de confirmação. Você já pode entrar normalmente."
              : tipo === "CONSUMIDOR"
                ? "Informe seu CPF completo e envie uma fatura CEMIG em seu nome. Os dados da unidade serão extraídos dela."
                : "Solicite seu acesso à Andrade Energy. Seus dados serão vinculados à unidade consumidora cadastrada."}
          </Text>

          {!solicitado ? (
            <>
              <Text style={styles.label}>Nome completo</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={20} color={Colors.subtitle} />
                <TextInput autoCapitalize="words" editable={false} onChangeText={(valor) => { setNome(valor); setErro(""); }} placeholder="Seu nome" placeholderTextColor="#92979F" style={styles.input} value={nome} />
              </View>
              <Text style={styles.label}>{tipo === "CONSUMIDOR" ? "CPF do titular" : "CPF"}</Text>
              <View style={styles.inputBox}>
                <TextInput
                  editable={tipo === "CONSUMIDOR"}
                  keyboardType="numeric"
                  maxLength={11}
                  onChangeText={(valor) => { setCpf(valor.replace(/\D/g, "")); setErro(""); }}
                  placeholder="Somente números"
                  placeholderTextColor="#92979F"
                  style={styles.inputWithoutIcon}
                  value={cpf}
                />
              </View>
              {tipo === "CONSUMIDOR" ? <Text style={styles.fieldHint}>Digite os 11 números. Usaremos os quatro primeiros para abrir a fatura CEMIG protegida e conferir os dados exibidos.</Text> : null}
              {tipo === "CONSUMIDOR" ? <>
                <Text style={styles.label}>Fatura CEMIG do titular</Text>
                <TouchableOpacity accessibilityLabel="Selecionar fatura CEMIG em PDF" activeOpacity={0.8} onPress={escolherFatura} style={[styles.invoicePicker, fatura && styles.invoicePickerSelected]}>
                  <Ionicons name={fatura ? "document-text" : "document-attach-outline"} size={22} color={Colors.primary} />
                  <View style={styles.invoicePickerCopy}>
                    <Text numberOfLines={1} style={styles.invoicePickerTitle}>{fatura?.name ?? "Selecionar fatura em PDF"}</Text>
                    <Text style={styles.invoicePickerHint}>{fatura ? "Fatura selecionada. Você pode tocar para trocar." : "Envie uma conta da CEMIG que esteja em seu nome."}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.subtitle} />
                </TouchableOpacity>
              </> : null}
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color={Colors.subtitle} />
                <TextInput autoCapitalize="none" autoComplete="email" editable={false} keyboardType="email-address" onChangeText={(valor) => { setEmail(valor); setErro(""); }} onSubmitEditing={solicitarAcesso} placeholder="seu@email.com" placeholderTextColor="#92979F" returnKeyType="send" style={styles.input} value={email} />
              </View>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputBox}><Ionicons name="lock-closed-outline" size={20} color={Colors.subtitle} /><TextInput onChangeText={(valor) => { setSenha(valor); setErro(""); }} placeholder="Mínimo de 6 caracteres" placeholderTextColor="#92979F" secureTextEntry style={styles.input} value={senha} /></View>
              <Text style={styles.label}>Confirmar senha</Text>
              <View style={styles.inputBox}><Ionicons name="lock-closed-outline" size={20} color={Colors.subtitle} /><TextInput onChangeText={(valor) => { setConfirmacao(valor); setErro(""); }} onSubmitEditing={solicitarAcesso} placeholder="Digite a senha novamente" placeholderTextColor="#92979F" secureTextEntry style={styles.input} value={confirmacao} /></View>
              {erro ? <Text style={styles.error}>{erro}</Text> : null}
              <TouchableOpacity disabled={salvando} onPress={solicitarAcesso} style={[styles.primaryButton, salvando && { opacity: 0.7 }]}>{salvando ? <ActivityIndicator color={Colors.surface} /> : <Text style={styles.primaryText}>Criar minha conta</Text>}</TouchableOpacity>
            </>
          ) : (
            <>
              {tipo === "CONSUMIDOR" ? <TouchableOpacity disabled={reenviando} onPress={reenviarConfirmacao} style={[styles.secondaryButton, reenviando && { opacity: 0.7 }]}>{reenviando ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.secondaryText}>Reenviar e-mail de confirmação</Text>}</TouchableOpacity> : null}
              <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.primaryButton}><Text style={styles.primaryText}>Voltar para o login</Text></TouchableOpacity>
            </>
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
  fieldHint: { marginTop: 6, color: Colors.subtitle, fontSize: 11, lineHeight: 16 },
  invoicePicker: { minHeight: 70, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: "#C7CACD", borderRadius: Radius.md, backgroundColor: Colors.surface },
  invoicePickerSelected: { borderColor: Colors.primary, backgroundColor: "#F0F8F2" },
  invoicePickerCopy: { flex: 1, marginHorizontal: Spacing.sm },
  invoicePickerTitle: { color: Colors.text, fontSize: Typography.small, fontWeight: "800" },
  invoicePickerHint: { marginTop: 3, color: Colors.subtitle, fontSize: 11, lineHeight: 15 },
  error: { marginTop: Spacing.sm, color: Colors.danger, fontSize: Typography.small },
  secondaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, backgroundColor: "rgba(255,255,255,0.55)" },
  secondaryText: { color: Colors.primary, fontSize: Typography.body, fontWeight: "900" },
  primaryButton: { minHeight: 56, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primary },
  primaryText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" },
});
