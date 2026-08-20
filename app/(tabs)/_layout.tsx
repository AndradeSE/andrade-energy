import { Ionicons } from "@expo/vector-icons";
import { LocaleDirContext, ParamListBase, TabNavigationState } from "@react-navigation/native";
import { createMaterialTopTabNavigator, MaterialTopTabNavigationEventMap, MaterialTopTabNavigationOptions } from "@react-navigation/material-top-tabs";
import { Tabs, withLayoutContext } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { IS_GERADOR_APP } from "../../config/appVariant";

const TopTabs = createMaterialTopTabNavigator();
const OWNER_TAB_ORDER = [
  "index",
  "clientes",
  "usinas",
  "operacao",
  "faturas",
  "financeiro",
  "perfil",
];

const OwnerTabs = withLayoutContext<MaterialTopTabNavigationOptions, typeof TopTabs.Navigator, TabNavigationState<ParamListBase>, MaterialTopTabNavigationEventMap>(
  TopTabs.Navigator,
  (screens) =>
    [...screens].sort(
      (first, second) =>
        OWNER_TAB_ORDER.indexOf(first.name ?? "") -
        OWNER_TAB_ORDER.indexOf(second.name ?? "")
    ),
  true
);

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

  const appConsumidor = !IS_GERADOR_APP;
  if (appConsumidor || perfil === "LEITURA") {
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
          name="contrato"
          options={{
            title: "Contrato",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "document-text" : "document-text-outline"} color={color} size={24} />
            ),
          }}
        />

        <Tabs.Screen
          name="faturas"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen name="perfil" options={{ href: null, tabBarItemStyle: { display: "none" } }} />

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
  // PROPRIETÁRIO DA USINA
  // ===================================================

  return (
    <LocaleDirContext.Provider value="ltr">
    <OwnerTabs initialRouteName="index" tabBarPosition="bottom" screenOptions={{
      swipeEnabled: true,
      animationEnabled: true,
      lazy: true,
      tabBarShowIcon: true,
      tabBarShowLabel: true,
      tabBarScrollEnabled: false,
      tabBarActiveTintColor: "#16A34A",
      tabBarInactiveTintColor: "#94A3B8",
      tabBarLabelStyle: { width: "100%", margin: 0, fontSize: 10, lineHeight: 13, fontWeight: "600", textAlign: "center", textTransform: "none" },
      tabBarItemStyle: { flex: 1, minWidth: 0, paddingHorizontal: 0, paddingVertical: 6 },
      tabBarContentContainerStyle: { width: "100%", alignItems: "stretch" },
      tabBarIndicatorStyle: { backgroundColor: "#16A34A", height: 3, top: 0 },
      tabBarStyle: { height: 82, paddingTop: 7, backgroundColor: "#FFFFFF", elevation: 15, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -3 } },
    }}>
      <OwnerTabs.Screen
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

      <OwnerTabs.Screen
        name="clientes"
        options={{
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

      <OwnerTabs.Screen
        name="usinas"
        options={{
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

      <OwnerTabs.Screen
        name="operacao"
        options={{
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

      <OwnerTabs.Screen
        name="faturas"
        options={{
          title: "Faturas",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} color={color} size={24} />
          ),
        }}
      />

      <OwnerTabs.Screen
        name="financeiro"
        options={{
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

      <OwnerTabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} color={color} size={24} />
          ),
        }}
      />

    </OwnerTabs>
    </LocaleDirContext.Provider>
  );
}
