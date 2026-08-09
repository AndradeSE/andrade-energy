import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../contexts/AuthContext";
import { login } from "../../services/auth.service";

export default function Login() {
  const { login: salvarSessao } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] =
    useState(false);

  async function entrar() {
    try {
      setLoading(true);

      const resposta = await login(
        email.trim(),
        senha
      );

     await salvarSessao(
  resposta.token,
  resposta.usuario
);

      router.replace("/");

    } catch (e: any) {

      Alert.alert(
        "Login",
        e?.response?.data?.message ??
          "Usuário ou senha inválidos."
      );

    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      resizeMode="cover"
      style={styles.background}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <View style={styles.logoArea}>

         <Image
  source={require("../../assets/images/icon.png")}
  style={styles.logo}
  resizeMode="contain"
/>

          <Text style={styles.titulo}>
            Andrade Energy
          </Text>

          <Text style={styles.subtitulo}>
            Plataforma Inteligente de Gestão
          </Text>

        </View>

        <View style={styles.card}>

          <Text style={styles.label}>
            E-mail
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Digite seu e-mail"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text
            style={[
              styles.label,
              {
                marginTop: 18,
              },
            ]}
          >
            Senha
          </Text>

          <View style={styles.passwordContainer}>

            <TextInput
              style={styles.passwordInput}
              placeholder="Digite sua senha"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!mostrarSenha}
              value={senha}
              onChangeText={setSenha}
            />

            <TouchableOpacity
              onPress={() =>
                setMostrarSenha(
                  !mostrarSenha
                )
              }
            >
              <Ionicons
                name={
                  mostrarSenha
                    ? "eye-off"
                    : "eye"
                }
                size={22}
                color="#64748B"
              />
            </TouchableOpacity>

          </View>
                    <TouchableOpacity
            style={styles.botao}
            onPress={entrar}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFF"
              />
            ) : (
              <Text
                style={styles.botaoTexto}
              >
                Entrar
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.demoArea}>
  <Text style={styles.demoTitulo}>
    Usuários de demonstração
  </Text>

  <Text style={styles.demoTexto}>
    Admin:
    {"\n"}
    admin@andrade.com
  </Text>

  <Text style={styles.demoTexto}>
    Gerador:
    {"\n"}
    gerador@andrade.com
  </Text>

  <Text style={styles.demoTexto}>
    Cliente:
    {"\n"}
    cliente@andrade.com
  </Text>

  <Text style={styles.demoSenha}>
    Senha: 123456
  </Text>
</View>

        </View>

        <Text style={styles.rodape}>
          Andrade Energy • v1.0
        </Text>

      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({

  background: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  logoArea: {
    alignItems: "center",
    marginBottom: 35,
  },

  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },

  titulo: {
    fontSize: 34,
    fontWeight: "700",
    color: "#0F172A",
  },

  subtitulo: {
    marginTop: 6,
    fontSize: 15,
    color: "#64748B",
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  label: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 8,
    fontWeight: "600",
  },

  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    color: "#111827",
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },

  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
    botao: {
    marginTop: 28,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },

  botaoTexto: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },

  demoArea: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },

  demoTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    textAlign: "center",
  },

  demoTexto: {
    textAlign: "center",
    color: "#475569",
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },

  demoSenha: {
    textAlign: "center",
    color: "#16A34A",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },

  rodape: {
    textAlign: "center",
    marginTop: 28,
    color: "#64748B",
    fontSize: 13,
  },

});