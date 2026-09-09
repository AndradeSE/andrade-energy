import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { IS_GERADOR_APP } from "../../config/appVariant";
import AppTabIcon from "../../components/navigation/AppTabIcon";

function TabIcon({ name, color, featured = false }: { name: keyof typeof Ionicons.glyphMap; color: string; featured?: boolean }) {
  return <AppTabIcon name={name} color={color} featured={featured} />;
}

function RoundedTabBarBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.tabBarCornerFill} />
      <View style={styles.tabBarSurface} />
    </View>
  );
}

export default function TabLayout() {
  const tabStyle = {
    height: 64,
    paddingTop: 5,
    paddingBottom: 3,
    backgroundColor: "transparent",
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
    tabBarBackground: () => <RoundedTabBarBackground />,
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
          name="economia"
          options={{
            title: "Economia",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "flash" : "flash-outline"} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon featured name={focused ? "home" : "home-outline"} color={color} />
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
    <Tabs initialRouteName="index" screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: "#16A34A",
      tabBarInactiveTintColor: "#94A3B8",
      tabBarHideOnKeyboard: true,
      tabBarLabelStyle: { fontSize: 8, lineHeight: 10, fontWeight: "700", marginBottom: 0 },
      tabBarItemStyle: { minHeight: 52, paddingHorizontal: 0, paddingVertical: 1 },
      tabBarStyle: { height: 66, paddingTop: 5, paddingBottom: 3, overflow: "visible", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "transparent", elevation: 15, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -3 } },
      tabBarBackground: () => <RoundedTabBarBackground />,
      sceneStyle: { backgroundColor: "#DFE8E3" },
    }}>
      <Tabs.Screen
        name="clientes"
        options={{
          title: "Clientes",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "people" : "people-outline"} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="usinas"
        options={{
          title: "Usinas",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "flash" : "flash-outline"} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="operacao"
        options={{
          title: "Operação",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "construct" : "construct-outline"} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon featured name={focused ? "home" : "home-outline"} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="faturas"
        options={{
          title: "Faturas",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "receipt" : "receipt-outline"} color={color} />
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
        name="financeiro"
        options={{
          title: "Financeiro",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "cash" : "cash-outline"} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{ href: null }}
      />

      <Tabs.Screen name="economia" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarCornerFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#DFE8E3",
  },
  tabBarSurface: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
  },
});
