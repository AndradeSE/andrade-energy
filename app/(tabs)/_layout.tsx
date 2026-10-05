import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { listarUsinas } from "../../services/usinas.service";
import { plantSelectionExists } from "../../utils/plant-selection";
import { Screen, Button, EmptyState } from "../../components/ui";
import TabDataPending from "../../components/ui/TabDataPending";
import { IS_GERADOR_APP } from "../../config/appVariant";
import AppTabIcon from "../../components/navigation/AppTabIcon";
import UnifiedExpoTabBar from "../../components/navigation/UnifiedExpoTabBar";
import { APP_TAB_BAR_METRICS } from "../../components/navigation/AppTabBarFrame";

function TabIcon({ name, color, featured = false }: { name: keyof typeof Ionicons.glyphMap; color: string; featured?: boolean }) {
  return <AppTabIcon name={name} color={color} featured={featured} />;
}

export default function TabLayout() {
  const { usuario, usinaSelecionada, isLoading } = useAuth();
  const validarUsina = IS_GERADOR_APP && (usuario?.perfil === "ADMIN" || usuario?.perfil === "GESTOR");
  const usinaId = usinaSelecionada?.id ?? usuario?.usina_id;
  const usinas = useQuery<{ id: string }[]>({
    queryKey: ["usinas-validacao-entrada", usuario?.id, usuario?.empresa_id],
    queryFn: listarUsinas,
    enabled: validarUsina && !isLoading && Boolean(usinaId),
    refetchOnMount: "always",
    retry: 1,
  });
  if (validarUsina) {
    if (isLoading || (usinaId && (usinas.isPending || usinas.isFetching))) return <Screen><TabDataPending /></Screen>;
    if (!usinaId) return <Redirect href="/selecionar-unidade" />;
    if (usinas.isError) return <Screen><EmptyState title="Não foi possível verificar suas usinas" subtitle="Não foi possível consultar a conta. Isso não significa que suas usinas foram removidas." /><Button title="Tentar novamente" onPress={() => void usinas.refetch()} /></Screen>;
    if (!plantSelectionExists(usinas.data ?? [], usinaId)) return <Redirect href="/selecionar-unidade" />;
  }
  const tabStyle = {
    height: APP_TAB_BAR_METRICS.height,
    paddingTop: APP_TAB_BAR_METRICS.paddingTop,
    paddingBottom: APP_TAB_BAR_METRICS.paddingBottom,
    overflow: "visible",
    backgroundColor: "transparent",
    borderTopLeftRadius: APP_TAB_BAR_METRICS.radius,
    borderTopRightRadius: APP_TAB_BAR_METRICS.radius,
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
    animation: "none" as const,

    tabBarActiveTintColor: "#16A34A",

    tabBarInactiveTintColor: "#94A3B8",

    tabBarHideOnKeyboard: true,

    tabBarLabelStyle: {
      fontSize: 8,
      lineHeight: 10,
      fontWeight: "700" as const,
      marginBottom: 0,
    },

    tabBarItemStyle: {
      minHeight: 52,
      paddingHorizontal: 0,
      paddingVertical: 1,
    },

    tabBarStyle: tabStyle,
  };

  // ===================================================
  // CLIENTE
  // ===================================================

  if (!IS_GERADOR_APP) {
    return (
      <Tabs
        backBehavior="initialRoute"
        detachInactiveScreens={false}
        initialRouteName="index"
        tabBar={(props) => <UnifiedExpoTabBar {...props} />}
        screenOptions={{
          ...screenOptions,
          tabBarActiveTintColor: "#0D9488",
          sceneStyle: { backgroundColor: "#DFE8E3" },
        }}
      >
        <Tabs.Screen
          name="economia"
          options={{
            lazy: false,
            title: "Economia",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "flash" : "flash-outline"} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="faturas"
          options={{
            lazy: false,
            title: "Faturas",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "receipt" : "receipt-outline"} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="index"
          options={{
            lazy: false,
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon featured name={focused ? "home" : "home-outline"} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="contrato"
          options={{
            lazy: false,
            title: "Contrato",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "document-text" : "document-text-outline"} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="perfil"
          options={{
            lazy: false,
            title: "Perfil",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "person" : "person-outline"} color={color} />
            ),
          }}
        />

        <Tabs.Screen name="faturamento" options={{ href: null }} />

        <Tabs.Screen name="equipe" options={{ href: null }} />


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
    <Tabs
      backBehavior="history"
      detachInactiveScreens={false}
      tabBar={(props) => <UnifiedExpoTabBar {...props} />}
      initialRouteName="index"
      screenOptions={{
        ...screenOptions,
        sceneStyle: { backgroundColor: "#DFE8E3" },
      }}
    >
      <Tabs.Screen
        name="clientes"
        options={{
          lazy: false,
          title: "Clientes",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "people" : "people-outline"} color={color} />
          ),
        }}
      />

      <Tabs.Screen name="equipe" options={{ lazy: false, title: "Colaboradores", tabBarIcon: ({ color, focused }) => (
        <TabIcon name={focused ? "people-circle" : "people-circle-outline"} color={color} />
      ) }} />
      <Tabs.Screen name="usinas" options={{ href: null }} />

      <Tabs.Screen
        name="operacao"
        options={{
          lazy: false,
          title: "Operação",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "construct" : "construct-outline"} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          lazy: false,
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon featured name={focused ? "home" : "home-outline"} color={color} />
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
        name="faturamento"
        options={{
          lazy: false,
          title: "Faturamento",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "receipt" : "receipt-outline"} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="financeiro"
        options={{
          lazy: false,
          title: "Financeiro",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "cash" : "cash-outline"} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="contrato"
        options={{
          lazy: false,
          title: "Contrato",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "document-text" : "document-text-outline"} color={color} />
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
