import { router, Stack, useGlobalSearchParams, usePathname } from "expo-router";
import { Alert, AppState, BackHandler, StyleSheet, ToastAndroid, View } from "react-native";
import { useEffect, useRef, useState } from "react";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";

import {
  AuthProvider,
  useAuth,
} from "../contexts/AuthContext";

import BiometricLock from "./biometric-lock";
import { EmpresaProvider } from "../contexts/EmpresaContext";
import { aoExcluirConta, aoSubstituirSessao } from "../services/session-events";
import PersistentAppTabs from "../components/navigation/PersistentAppTabs";
import ContractAccessGate from "../components/navigation/ContractAccessGate";
import Loading from "../components/ui/Loading";
import { IS_GERADOR_APP } from "../config/appVariant";
import { registrarPushAndroid } from "../services/notificacoes.service";
import * as Notifications from "expo-notifications";
import { preloadNavigationData } from "../services/navigation-preload.service";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const activeQueryClient = useQueryClient();
  const primeiraAutenticacaoBiometrica = useRef(true);
  const ultimoVoltarNaHome = useRef(0);
  const pathname = usePathname();
  const routeParams = useGlobalSearchParams<{ aba?: string; ambiente?: string; origem?: string }>();
  const {
    session,
    isLoading,
    digitalEnabled,
    isUnlocked,
    signOut,
    unidadeSelecionada,
    usinaSelecionada,
  } = useAuth();
  const [readyUserId, setReadyUserId] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = session?.user;
    if (isLoading || !currentUser?.id || readyUserId === String(currentUser.id)) return;
    let active = true;
    void Promise.race([
      preloadNavigationData(activeQueryClient, IS_GERADOR_APP, currentUser, unidadeSelecionada, usinaSelecionada),
      // Em instâncias gratuitas o backend pode levar ~50 s para acordar.
      // Preserve o carregamento na abertura, não na primeira troca de aba.
      new Promise<void>((resolve) => setTimeout(resolve, 60000)),
    ])
      .finally(() => { if (active) setReadyUserId(String(currentUser.id)); });
    return () => { active = false; };
  }, [activeQueryClient, isLoading, readyUserId, session?.user?.id, unidadeSelecionada?.id, usinaSelecionada?.id]);
  const alertaSessaoAberto = useRef(false);

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    let ativo = true;
    const registrar = () => void registrarPushAndroid().catch((erro) => {
      if (ativo) console.warn("Não foi possível registrar o push Android", erro);
    });
    registrar();
    const appState = AppState.addEventListener("change", (estado) => {
      if (estado === "active") registrar();
    });
    const resposta = Notifications.addNotificationResponseReceivedListener((evento) => {
      const url = evento.notification.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/")) router.push(url as any);
    });
    return () => {
      ativo = false;
      appState.remove();
      resposta.remove();
    };
  }, [session?.user?.id, session?.user?.empresa_id]);

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

  useEffect(() => {
    if (!session || precisaRotaLivre(pathname)) return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const papel = String(session.user?.papel_empresa ?? "");
      const ambienteComercial = IS_GERADOR_APP && (
        pathname.startsWith("/admin/comercial") ||
        pathname.startsWith("/geradores") ||
        (pathname.startsWith("/colaboradores") && (routeParams.ambiente === "comercial" || papel === "COLABORADOR_COMERCIAL")) ||
        (pathname.startsWith("/perfil") && routeParams.origem === "comercial")
      );
      const home = ambienteComercial ? "/admin/comercial" : "/(tabs)";
      const jaEstaNaHome = ambienteComercial
        ? pathname === "/admin/comercial"
        : pathname === "/" || pathname === "/index";

      if (jaEstaNaHome) {
        const agora = Date.now();
        if (agora - ultimoVoltarNaHome.current <= 2200) return false;
        ultimoVoltarNaHome.current = agora;
        ToastAndroid.show("Pressione voltar novamente para sair", ToastAndroid.SHORT);
        return true;
      }

      ultimoVoltarNaHome.current = 0;
      if (router.canGoBack()) {
        router.back();
        return true;
      }

      router.replace(home as any);
      return true;
    });
    return () => subscription.remove();
  }, [pathname, routeParams.ambiente, routeParams.origem, session]);

  /*
   * Enquanto recuperamos a sessão,
   * mantemos o Stack montado.
   */
  if (isLoading || (session?.user?.id && readyUserId !== String(session.user.id))) {
    return <Loading />;
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
    <ContractAccessGate />
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

        <Stack.Screen
          name="(auth)/redefinir-senha"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="selecionar-gerador"
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
        <Stack.Screen name="colaboradores/index" options={{ headerShown: false }} />
        <Stack.Screen name="assinatura/index" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
    </View>
    <PersistentAppTabs loggedIn={loggedIn && !precisaDigital} />
    {precisaDigital ? <View style={styles.lockOverlay}><BiometricLock onUnlocked={concluirAutenticacaoBiometrica} /></View> : null}
    </>
  );
}

function precisaRotaLivre(pathname: string) {
  return pathname.startsWith("/login") || pathname.startsWith("/cadastro") || pathname.startsWith("/recuperar-senha");
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

});
