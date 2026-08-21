import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ElasticScrollView as ScrollView } from "../../components/ui/ElasticScroll";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  function solicitarRecuperacao() {
    const normalizado = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado)) {
      setErro("Informe um e-mail válido.");
      return;
    }
    setErro("");
    setEnviado(true);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={23} color={Colors.text} />
          </TouchableOpacity>

          <View style={styles.iconBox}>
            <Ionicons name={enviado ? "mail-open-outline" : "key-outline"} size={34} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{enviado ? "Confira seu e-mail" : "Recuperar senha"}</Text>
          <Text style={styles.subtitle}>
            {enviado
              ? "Se existir uma conta com esse e-mail, você receberá as orientações para recuperar o acesso."
              : "Informe o e-mail usado no cadastro para receber as orientações de recuperação."}
          </Text>

          {!enviado ? (
            <>
              <Text style={styles.label}>E-mail</Text>
              <View style={[styles.inputBox, Boolean(erro) && styles.inputError]}>
                <Ionicons name="mail-outline" size={20} color={Colors.subtitle} />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={(valor) => { setEmail(valor); setErro(""); }}
                  onSubmitEditing={solicitarRecuperacao}
                  placeholder="seu@email.com"
                  placeholderTextColor="#92979F"
                  returnKeyType="send"
                  style={styles.input}
                  value={email}
                />
              </View>
              {erro ? <Text style={styles.error}>{erro}</Text> : null}
              <TouchableOpacity onPress={solicitarRecuperacao} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Enviar orientações</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.primaryButton}>
              <Text style={styles.primaryText}>Voltar para o login</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F5" },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: Spacing.lg },
  back: { position: "absolute", top: Spacing.lg, left: Spacing.lg, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#DEE0E3" },
  iconBox: { width: 70, height: 70, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#DEE0E3" },
  title: { marginTop: Spacing.lg, color: Colors.text, fontSize: 28, fontWeight: "900" },
  subtitle: { marginTop: Spacing.sm, marginBottom: Spacing.xl, color: Colors.subtitle, fontSize: Typography.body, lineHeight: 23 },
  label: { marginBottom: 7, color: Colors.text, fontSize: Typography.small, fontWeight: "800" },
  inputBox: { minHeight: 54, flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: "#C7CACD", borderRadius: Radius.md, backgroundColor: Colors.surface },
  inputError: { borderColor: Colors.danger },
  input: { flex: 1, height: 52, marginLeft: Spacing.xs, color: Colors.text, fontSize: Typography.body },
  error: { marginTop: 5, color: Colors.danger, fontSize: Typography.small },
  primaryButton: { minHeight: 56, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primary },
  primaryText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" },
});
