import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";

export default function TabLayout() {
  const { usuario } = useAuth();

  const perfil = usuario?.perfil;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#16A34A",
        tabBarInactiveTintColor: "#94A3B8",

        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          elevation: 0,
          shadowOpacity: 0,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="grid-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {(perfil === "ADMIN" || perfil === "GERADOR") && (
        <Tabs.Screen
          name="clientes"
          options={{
            title: "Clientes",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="people-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
      )}

      {(perfil === "ADMIN" || perfil === "GERADOR") && (
        <Tabs.Screen
          name="usinas"
          options={{
            title: "Usinas",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="flash-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
      )}

      <Tabs.Screen
        name="faturas"
        options={{
          title: "Faturas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="document-text-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      {(perfil === "ADMIN" || perfil === "GERADOR") && (
        <Tabs.Screen
          name="financeiro"
          options={{
            title: "Financeiro",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="wallet-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
      )}

      {(perfil === "ADMIN" || perfil === "GERADOR") && (
        <Tabs.Screen
          name="operacao"
          options={{
            title: "Operação",
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name="analytics-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
      )}

      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}