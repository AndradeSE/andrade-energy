import { Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  AuthProvider,
  useAuth,
} from "../contexts/AuthContext";

const queryClient = new QueryClient();

function RootNavigation() {
  const { usuario, loading, unidadeSelecionada, usinaSelecionada } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth =
      segments[0] === "(auth)";
    const inUnitSelection = segments[0] === "selecionar-unidade";
    const inConsumerSetup = segments[0] === "unidades";
    const inGeneratorSetup = segments[0] === "usinas";

    if (!usuario && !inAuth) {
      router.replace("/(auth)/login");
      return;
    }

    if (usuario?.perfil === "LEITURA" && !unidadeSelecionada && !inUnitSelection && !inConsumerSetup) {
      router.replace("/selecionar-unidade");
      return;
    }

    const gestor = usuario?.perfil === "ADMIN" || usuario?.perfil === "GESTOR";
    if (gestor && !usinaSelecionada && !inUnitSelection && !inGeneratorSetup) {
      router.replace("/selecionar-unidade");
      return;
    }

    const selecaoConcluida = usuario?.perfil === "LEITURA" ? unidadeSelecionada : usinaSelecionada;
    if (usuario && (inAuth || (inUnitSelection && selecaoConcluida))) {
      router.replace("/(tabs)");
    }
  }, [usuario, unidadeSelecionada, usinaSelecionada, loading, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
