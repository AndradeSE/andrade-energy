import { router, Stack } from "expo-router";
import { Alert, ImageBackground, StyleSheet, View } from "react-native";
import { useEffect, useRef } from "react";

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
import { EmpresaProvider } from "../contexts/EmpresaContext";
import { aoExcluirConta, aoSubstituirSessao } from "../services/session-events";
import PersistentAppTabs from "../components/navigation/PersistentAppTabs";

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
    signOut,
  } = useAuth();
  const alertaSessaoAberto = useRef(false);

  useEffect(() => aoSubstituirSessao(() => {
    if (alertaSessaoAberto.current) return;
    alertaSessaoAberto.current = true;
    Alert.alert(
      "Conta aberta em outro aparelho",
      "Esta sessão foi substituída por um acesso mais recente. Deseja entrar novamente aqui e desconectar o outro aparelho?",
      [
        {
          text: "Voltar ao login",
          style: "cancel",
          onPress: () => {
            alertaSessaoAberto.current = false;
            void signOut().then(() => router.replace("/(auth)/login" as any));
          },
        },
        {
          text: "Entrar neste aparelho",
          onPress: () => {
            alertaSessaoAberto.current = false;
            void signOut().then(() => router.replace("/(auth)/login" as any));
          },
        },
      ],
      { cancelable: false },
    );
  }), [signOut]);

  useEffect(() => aoExcluirConta(() => {
    // Uma conta de consumidor removida pelo gerador não possui mais uma
    // sessão recuperável. Limpamos o estado local imediatamente para evitar
    // que o aplicativo permaneça numa tela interna sem dados.
    void signOut().then(() => router.replace("/(auth)/login" as any));
  }), [signOut]);

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
    <View style={styles.navigator}>
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
          name="(auth)/verificar-email"
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
        <Stack.Screen name="admin/empresas" options={{ headerShown: false }} />

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
        <Stack.Screen name="faturamento/criar-manual" options={{ headerShown: false }} />

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
        <Stack.Screen name="tutoriais" options={{ headerShown: false }} />
        <Stack.Screen name="geradores/convidar" options={{ headerShown: false }} />
        <Stack.Screen name="assinatura/index" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
    </View>
    <PersistentAppTabs loggedIn={loggedIn && !precisaDigital} />
    {precisaDigital ? <View style={styles.lockOverlay}><BiometricLock onUnlocked={concluirAutenticacaoBiometrica} /></View> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <EmpresaProvider>
            <RootNavigator />
          </EmpresaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  navigator: {
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
