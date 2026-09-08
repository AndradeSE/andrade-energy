import { Ionicons } from "@expo/vector-icons";
import { LocaleDirContext, ParamListBase, TabNavigationState } from "@react-navigation/native";
import { createMaterialTopTabNavigator, MaterialTopTabNavigationEventMap, MaterialTopTabNavigationOptions } from "@react-navigation/material-top-tabs";
import { Tabs, withLayoutContext } from "expo-router";
import { IS_GERADOR_APP } from "../../config/appVariant";

function TabIcon({ name, color, featured = false }: { name: keyof typeof Ionicons.glyphMap; color: string; featured?: boolean }) {
  if (!featured) return <Ionicons name={name} color={color} size={21} />;
  return <Ionicons name={name} color="#FFFFFF" size={25} style={{ width: 50, height: 50, paddingTop: 12, textAlign: "center", borderRadius: 25, backgroundColor: "#12B981", transform: [{ translateY: -11 }], shadowColor: "#12B981", shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 8 }} />;
}

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
  const tabStyle = {
    height: 64,
    paddingTop: 5,
    paddingBottom: 3,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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

  if (!IS_GERADOR_APP) {
    return (
      <Tabs
        screenOptions={{
          ...screenOptions,
          tabBarLabelStyle: { fontSize: 10, lineHeight: 12, fontWeight: "700", marginBottom: 0 },
          tabBarItemStyle: { minHeight: 50, paddingVertical: 1 },
          tabBarActiveTintColor: "#0D9488",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "home" : "home-outline"} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="economia"
          options={{
            title: "Economia",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon featured name={focused ? "flash" : "flash-outline"} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="contrato"
          options={{
            title: "Contrato",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "document-text" : "document-text-outline"} color={color} />
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
      tabBarLabelStyle: { width: "100%", margin: 0, fontSize: 9, lineHeight: 11, fontWeight: "700", textAlign: "center", textTransform: "none" },
      tabBarItemStyle: { flex: 1, minWidth: 0, minHeight: 56, paddingHorizontal: 0, paddingVertical: 2 },
      tabBarContentContainerStyle: { width: "100%", alignItems: "stretch" },
      tabBarIndicatorStyle: { backgroundColor: "#16A34A", height: 3, top: 0, borderRadius: 3 },
      tabBarStyle: { height: 70, paddingTop: 5, paddingBottom: 3, overflow: "visible", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#FFFFFF", elevation: 15, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
    }}>
      <OwnerTabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home" : "home-outline"} color={color} />
          ),
        }}
      />

      <OwnerTabs.Screen
        name="clientes"
        options={{
          title: "Clientes",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "people" : "people-outline"} color={color} />
          ),
        }}
      />

      <OwnerTabs.Screen
        name="usinas"
        options={{
          title: "Usinas",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "flash" : "flash-outline"} color={color} />
          ),
        }}
      />

      <OwnerTabs.Screen
        name="operacao"
        options={{
          title: "Operação",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon featured name={focused ? "construct" : "construct-outline"} color={color} />
          ),
        }}
      />

      <OwnerTabs.Screen
        name="faturas"
        options={{
          title: "Faturas",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "receipt" : "receipt-outline"} color={color} />
          ),
        }}
      />

      <OwnerTabs.Screen
        name="financeiro"
        options={{
          title: "Financeiro",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "cash" : "cash-outline"} color={color} />
          ),
        }}
      />

      <OwnerTabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} />
          ),
        }}
      />

    </OwnerTabs>
    </LocaleDirContext.Provider>
  );
}
