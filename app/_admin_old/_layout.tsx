import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#16A34A",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="clientes"
        options={{
          title: "Clientes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="people"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="usinas"
        options={{
          title: "Usinas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="flash"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="operacao"
        options={{
          title: "Operação",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="construct"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="financeiro"
        options={{
          title: "Financeiro",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="wallet"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}