import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLogin } from "../hooks/useLogin";
import { salvarSessao } from "../services/session.service";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useLogin();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#F8FAFC",
      }}
    >
      <Text
        style={{
          fontSize: 32,
          fontWeight: "bold",
          color: "#16A34A",
          marginBottom: 8,
        }}
      >
        Andrade Energy
      </Text>

      <Text
        style={{
          color: "#64748B",
          marginBottom: 32,
        }}
      >
        Faça login para continuar
      </Text>

      <TextInput
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          backgroundColor: "#FFF",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      />

      <TextInput
        placeholder="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        style={{
          backgroundColor: "#FFF",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}
      />

     <TouchableOpacity
  onPress={async () => {
    try {
      const usuario = await login.mutateAsync({
        email,
        senha,
      });

      await salvarSessao(usuario);

      console.log(usuario);

      router.replace("/(tabs)");

    } catch (e: any) {

      Alert.alert(
        "Erro",
        e.message
      );

    }
  }}
  style={{
    backgroundColor: "#16A34A",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  }}
>
  {login.isPending ? (
    <ActivityIndicator color="#FFF" />
  ) : (
    <Text
      style={{
        color: "#FFF",
        fontWeight: "bold",
        fontSize: 18,
      }}
    >
      Entrar
    </Text>
  )}
</TouchableOpacity>
    </SafeAreaView>
  );
}