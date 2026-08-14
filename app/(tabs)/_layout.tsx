import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";

export default function TabLayout() {
  const { usuario } = useAuth();

  const perfil = usuario?.perfil;

  const tabStyle = {
    height: 82,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: -3,
    },
  } as const;

  const screenOptions = {
    headerShown: false,

    tabBarActiveTintColor: "#16A34A",

    tabBarInactiveTintColor: "#94A3B8",

    tabBarHideOnKeyboard: true,

    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: "600" as const,
      marginBottom: 2,
    },

    tabBarStyle: tabStyle,
  };

  // ===================================================
  // CLIENTE
  // ===================================================

  if (perfil === "LEITURA") {
    return (
      <Tabs
        screenOptions={{
          ...screenOptions,
          tabBarStyle: {
            display: "none",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                color={color}
                size={24}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="economia"
          options={{
            title: "Economia",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={
                  focused
                    ? "flash"
                    : "flash-outline"
                }
                color={color}
                size={24}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="perfil"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={
                  focused
                    ? "person"
                    : "person-outline"
                }
                color={color}
                size={24}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="faturas"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="contrato"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="clientes"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="usinas"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="operacao"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="financeiro"
          options={{
            href: null,
          }}
        />
      </Tabs>
    );
  }

  // ===================================================
  // ADMIN / GESTOR
  // ===================================================

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="clientes"
        options={{
          href:
            perfil === "ADMIN"
              ? undefined
              : null,
          title: "Clientes",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? "people"
                  : "people-outline"
              }
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="usinas"
        options={{
          href:
            perfil === "ADMIN"
              ? undefined
              : null,
          title: "Usinas",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? "flash"
                  : "flash-outline"
              }
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="operacao"
        options={{
          href:
            perfil === "ADMIN" ||
            perfil === "GESTOR"
              ? undefined
              : null,
          title: "Operação",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? "construct"
                  : "construct-outline"
              }
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="financeiro"
        options={{
          href:
            perfil === "ADMIN" ||
            perfil === "GESTOR"
              ? undefined
              : null,
          title: "Financeiro",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? "cash"
                  : "cash-outline"
              }
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? "person"
                  : "person-outline"
              }
              color={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="economia"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="faturas"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="contrato"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
