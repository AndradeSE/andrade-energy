import { Stack } from "expo-router";
import QueryProvider from "../providers/QueryProvider";

export default function RootLayout() {
  return (
    <QueryProvider>
      <Stack screenOptions={{ headerShown: false }}>

        <Stack.Screen name="login" />

        <Stack.Screen name="(tabs)" />

        <Stack.Screen name="clientes/[id]" />

        <Stack.Screen name="modal" />

      </Stack>
    </QueryProvider>
  );
}