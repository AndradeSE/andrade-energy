import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { criarConviteGerador } from "../../services/convites.service";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";
import { AppHeader, ElasticScrollView as ScrollView, Screen } from "../../components/ui";

export default function ConvidarGerador() {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (user?.perfil !== "ADMIN") {
    return <Screen><View style={styles.blocked}><Ionicons name="lock-closed-outline" size={38} color={Colors.danger} /><Text style={styles.title}>Acesso restrito</Text><Text style={styles.subtitle}>Somente a conta administradora pode convidar novos geradores.</Text><TouchableOpacity onPress={() => router.back()} style={styles.secondary}><Text style={styles.secondaryText}>Voltar</Text></TouchableOpacity></View></Screen>;
  }

  async function enviar() {
    if (!nome.trim() || cpf.replace(/\D/g, "").length !== 11 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return Alert.alert("Confira os dados", "Informe nome, CPF e e-mail válidos.");
    }
    try {
      setEnviando(true);
      const resultado = await criarConviteGerador({ nome: nome.trim(), cpf, email: email.trim().toLowerCase() });
      Alert.alert("Convite criado", resultado.emailEnviado ? "O convite foi enviado por e-mail." : `O e-mail não pôde ser enviado. Código: ${resultado.token}`,
        [{ text: "OK", onPress: () => router.back() }]);
    } catch (erro: any) {
      Alert.alert("Não foi possível criar o convite", erro?.response?.data?.message ?? erro?.message ?? "Tente novamente.");
    } finally { setEnviando(false); }
  }

  return <Screen>
    <AppHeader variant="subpage" title="Convidar gerador" subtitle="Acesso administrativo" contextTitle="Nova conta geradora" contextSubtitle="Convite válido por 7 dias" icon="person-add-outline" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.notice}><Ionicons name="shield-checkmark-outline" size={23} color={Colors.primary} /><Text>Esta função está disponível exclusivamente para a conta administradora.</Text></View>
      <View style={styles.card}>
        <Text style={styles.label}>Nome completo</Text><TextInput autoCapitalize="words" onChangeText={setNome} placeholder="Nome do novo gerador" placeholderTextColor={Colors.subtitle} style={styles.input} value={nome} />
        <Text style={styles.label}>CPF</Text><TextInput keyboardType="numeric" maxLength={11} onChangeText={(value) => setCpf(value.replace(/\D/g, ""))} placeholder="Somente números" placeholderTextColor={Colors.subtitle} style={styles.input} value={cpf} />
        <Text style={styles.label}>E-mail</Text><TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="gerador@email.com" placeholderTextColor={Colors.subtitle} style={styles.input} value={email} />
        <TouchableOpacity disabled={enviando} onPress={enviar} style={[styles.button, enviando && { opacity: .65 }]}>{enviando ? <ActivityIndicator color={Colors.surface} /> : <><Ionicons name="send-outline" size={20} color={Colors.surface} /><Text style={styles.buttonText}>Enviar convite</Text></>}</TouchableOpacity>
      </View>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl }, blocked: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl }, title: { marginTop: Spacing.md, color: Colors.text, fontSize: Typography.section, fontWeight: "900" }, subtitle: { marginTop: Spacing.xs, color: Colors.subtitle, textAlign: "center" },
  notice: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: "#E9F7EF" },
  card: { padding: Spacing.lg, borderRadius: Radius.xl, backgroundColor: Colors.surface, ...Shadows.card }, label: { marginTop: Spacing.sm, marginBottom: 7, color: Colors.text, fontSize: Typography.small, fontWeight: "800" }, input: { minHeight: 54, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, color: Colors.text, backgroundColor: Colors.surface },
  button: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, marginTop: Spacing.xl, borderRadius: Radius.md, backgroundColor: Colors.primary }, buttonText: { color: Colors.surface, fontWeight: "900" }, secondary: { marginTop: Spacing.lg, padding: Spacing.md }, secondaryText: { color: Colors.primary, fontWeight: "800" },
});
