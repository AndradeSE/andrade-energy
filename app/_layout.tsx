import { router, Stack } from "expo-router";
import { ImageBackground, StyleSheet, View } from "react-native";
import { useRef } from "react";

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
import BiometricLock from "./biometric-lock";

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
  const primeiraAutenticacaoBiometrica = useRef(true);
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

  function concluirAutenticacaoBiometrica() {
    if (!primeiraAutenticacaoBiometrica.current) return;
    primeiraAutenticacaoBiometrica.current = false;
    if (session?.user?.perfil === "ADMIN") {
      router.replace("/admin/escolher-area" as any);
    }
  }

  return (
    <>
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
      {/* APLICATIVO                    */}
      {/* ============================= */}

      {/*
       * As telas autenticadas permanecem montadas durante o bloqueio.
       * A biometria é exibida como sobreposição logo abaixo, preservando a
       * rota atual para a pessoa voltar exatamente de onde parou.
       */}
      <Stack.Protected guard={loggedIn}>
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

        <Stack.Screen name="admin/escolher-area" options={{ headerShown: false }} />
        <Stack.Screen name="admin/comercial" options={{ headerShown: false }} />

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
        <Stack.Screen name="geradores/gestao" options={{ headerShown: false }} />
        <Stack.Screen name="geradores/convidar" options={{ headerShown: false }} />
        <Stack.Screen name="assinatura/index" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
    {precisaDigital ? <View style={styles.lockOverlay}><BiometricLock onUnlocked={concluirAutenticacaoBiometrica} /></View> : null}
    </>
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

  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});
