import { Stack } from "expo-router";
import { ImageBackground, StyleSheet } from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  AuthProvider,
  useAuth,
} from "../contexts/AuthContext";

import { Colors } from "../theme";

/*
 * React Query
 *
 * Instância única para todo o aplicativo.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
    },
  },
});

function RootNavigator() {
  const {
    session,
    isLoading,
    digitalEnabled,
    isUnlocked,
  } = useAuth();

  /*
   * Enquanto recuperamos a sessão,
   * mantemos o Stack montado.
   */
  if (isLoading) {
    return (
      <ImageBackground source={require("../assets/images/usina-loading.jpeg")} resizeMode="cover" style={styles.loadingContainer} />
    );
  }

  const loggedIn = Boolean(session);

  /*
   * App pode ser acessado quando:
   *
   * - existe sessão
   *
   * E
   *
   * - digital está desativada
   * OU
   * - digital já foi validada
   */
  const appLiberado =
    loggedIn &&
    (!digitalEnabled || isUnlocked);

  /*
   * Usuário precisa validar digital quando:
   *
   * - possui sessão
   * - ativou digital
   * - ainda não desbloqueou o app
   */
  const precisaDigital =
    loggedIn &&
    digitalEnabled &&
    !isUnlocked;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      {/* ============================= */}
      {/* AUTENTICAÇÃO                  */}
      {/* ============================= */}

      <Stack.Protected guard={!loggedIn}>
        <Stack.Screen
          name="(auth)/login"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(auth)/criar-conta"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="(auth)/esqueci-senha"
          options={{
            headerShown: false,
          }}
        />
      </Stack.Protected>

      {/* ============================= */}
      {/* IMPRESSÃO DIGITAL             */}
      {/* ============================= */}

      <Stack.Protected guard={precisaDigital}>
        <Stack.Screen
          name="biometric-lock"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack.Protected>

      {/* ============================= */}
      {/* APLICATIVO                    */}
      {/* ============================= */}

      <Stack.Protected guard={appLiberado}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="selecionar-unidade"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="modal"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="contas-de-luz"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="email-conectado"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        {/* =========================== */}
        {/* CLIENTES                    */}
        {/* =========================== */}

        <Stack.Screen
          name="clientes/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="clientes/novo"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="clientes/editar"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="clientes/convidar"
          options={{
            headerShown: false,
          }}
        />

        {/* =========================== */}
        {/* UNIDADES                    */}
        {/* =========================== */}

        <Stack.Screen
          name="unidades/index"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="unidades/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="unidades/nova"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="unidades/editar"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="unidades/contrato"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="unidades/recebimento-email"
          options={{
            headerShown: false,
          }}
        />

        {/* =========================== */}
        {/* USINAS                      */}
        {/* =========================== */}

        <Stack.Screen
          name="usinas/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="usinas/nova"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="usinas/editar"
          options={{
            headerShown: false,
          }}
        />

        {/* =========================== */}
        {/* FATURAS                     */}
        {/* =========================== */}

        <Stack.Screen
          name="faturas/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="faturas/confirmar"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="faturas/pagamento"
          options={{
            headerShown: false,
          }}
        />

        {/* =========================== */}
        {/* FATURAMENTO                 */}
        {/* =========================== */}

        <Stack.Screen
          name="faturamento/manual"
          options={{
            headerShown: false,
          }}
        />

        {/* =========================== */}
        {/* OPERAÇÃO                    */}
        {/* =========================== */}

        <Stack.Screen
          name="operacao/[id]"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="operacao/novo"
          options={{
            headerShown: false,
          }}
        />

        {/* =========================== */}
        {/* CONTRATOS                   */}
        {/* =========================== */}

        <Stack.Screen
          name="contratos/index"
          options={{
            headerShown: false,
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
