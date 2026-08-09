import { Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";

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
  const { usuario, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth =
      segments[0] === "(auth)";

    if (!usuario && !inAuth) {
      router.replace("/(auth)/login");
      return;
    }

    if (usuario && inAuth) {
      router.replace("/(tabs)");
    }
  }, [usuario, loading]);

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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </QueryClientProvider>
  );
}