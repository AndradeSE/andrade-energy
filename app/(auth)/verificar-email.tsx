import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { verificarEmailDeCadastro } from "../../services/auth.service";
import { Colors, Radius, Spacing, Typography } from "../../theme";

export default function VerificarEmail() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const iniciou = useRef(false);
  const [carregando, setCarregando] = useState(Boolean(token));
  const [mensagem, setMensagem] = useState(token ? "Estamos confirmando o seu e-mail..." : "Abra o link enviado para o seu e-mail para concluir a confirmação.");
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!token || iniciou.current) return;
    iniciou.current = true;
    void confirmar();
  }, [token]);

  async function confirmar() {
    if (!token) return;
    try {
      setCarregando(true);
      const resultado = await verificarEmailDeCadastro(token);
      setMensagem(resultado.message);
      setSucesso(true);
    } catch (erro: any) {
      setMensagem(erro?.response?.data?.message ?? "Não foi possível confirmar este e-mail. Solicite um novo link na tela de cadastro.");
      setSucesso(false);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={[styles.iconBox, sucesso && styles.iconBoxSuccess]}>
          {carregando ? <ActivityIndicator color={Colors.primary} size="large" /> : <Ionicons name={sucesso ? "checkmark-circle-outline" : "mail-unread-outline"} size={42} color={sucesso ? Colors.success : Colors.primary} />}
        </View>
        <Text style={styles.title}>{carregando ? "Confirmando e-mail" : sucesso ? "E-mail confirmado" : "Confirmação necessária"}</Text>
        <Text style={styles.subtitle}>{mensagem}</Text>
        {!carregando && token && !sucesso ? <TouchableOpacity onPress={confirmar} style={styles.secondaryButton}><Text style={styles.secondaryText}>Tentar novamente</Text></TouchableOpacity> : null}
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")} style={styles.primaryButton}><Text style={styles.primaryText}>Voltar para o login</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F6F5" },
  content: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  iconBox: { width: 82, height: 82, alignItems: "center", justifyContent: "center", borderRadius: 25, backgroundColor: Colors.primaryLight },
  iconBoxSuccess: { backgroundColor: "#E4F5E8" },
  title: { marginTop: Spacing.lg, color: Colors.text, fontSize: 28, fontWeight: "900" },
  subtitle: { marginTop: Spacing.sm, color: Colors.subtitle, fontSize: Typography.body, lineHeight: 23 },
  primaryButton: { minHeight: 56, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.primary },
  primaryText: { color: Colors.surface, fontSize: Typography.body, fontWeight: "900" },
  secondaryButton: { minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: Spacing.lg, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md },
  secondaryText: { color: Colors.primary, fontSize: Typography.body, fontWeight: "900" },
});
