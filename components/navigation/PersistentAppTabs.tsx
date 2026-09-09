import { Ionicons } from "@expo/vector-icons";
import { router, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IS_GERADOR_APP } from "../../config/appVariant";
import { Colors } from "../../theme";
import AppTabIcon from "./AppTabIcon";

type TabItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const generatorTabs: TabItem[] = [
  { label: "Clientes", icon: "people-outline", route: "/(tabs)/clientes" },
  { label: "Usinas", icon: "flash-outline", route: "/(tabs)/usinas" },
  { label: "Operação", icon: "construct-outline", route: "/(tabs)/operacao" },
  { label: "Home", icon: "home-outline", route: "/(tabs)" },
  { label: "Faturas", icon: "receipt-outline", route: "/(tabs)/faturas" },
  { label: "Contrato", icon: "document-text-outline", route: "/(tabs)/contrato" },
  { label: "Financeiro", icon: "cash-outline", route: "/(tabs)/financeiro" },
];

const consumerTabs: TabItem[] = [
  { label: "Economia", icon: "flash-outline", route: "/(tabs)/economia" },
  { label: "Home", icon: "home-outline", route: "/(tabs)" },
  { label: "Contrato", icon: "document-text-outline", route: "/(tabs)/contrato" },
];

const commercialTabs: TabItem[] = [
  { label: "Geradores", icon: "people-outline", route: "/geradores/gestao?aba=GERADORES" },
  { label: "Home", icon: "home-outline", route: "/admin/comercial" },
  { label: "Assinaturas", icon: "card-outline", route: "/geradores/gestao?aba=ASSINATURAS" },
];

export default function PersistentAppTabs({ loggedIn }: { loggedIn: boolean }) {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const firstSegment = String(segments[0] ?? "");
  const secondSegment = String(segments[1] ?? "");
  const hasOwnCommercialTabs =
    (firstSegment === "admin" && secondSegment === "comercial") ||
    (firstSegment === "geradores" && ["gestao", "monitoramento"].includes(secondSegment));

  // As rotas principais já renderizam sua própria barra. Nas demais telas
  // autenticadas, esta barra permanece montada para a navegação nunca sumir.
  const hidden =
    !loggedIn ||
    firstSegment === "(tabs)" ||
    firstSegment === "(auth)" ||
    hasOwnCommercialTabs ||
    (firstSegment === "admin" && secondSegment === "escolher-area") ||
    (firstSegment === "admin" && secondSegment === "empresas") ||
    firstSegment === "selecionar-unidade" ||
    firstSegment === "biometric-lock";

  if (hidden) return null;

  const commercialEnvironment =
    IS_GERADOR_APP && (firstSegment === "admin" || firstSegment === "geradores");
  const tabs = commercialEnvironment
    ? commercialTabs
    : IS_GERADOR_APP
      ? generatorTabs
      : consumerTabs;

  return (
    <View style={styles.cornerFill}>
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 3) }]}>
      {tabs.map((tab) => {
        const featured = tab.label === "Home";
        return (
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={`Ir para ${tab.label}`}
          key={tab.label}
          onPress={() => router.replace(tab.route as never)}
          style={styles.item}
        >
          <AppTabIcon
            name={tab.icon}
            color={Colors.subtitle}
            featured={featured}
            size={IS_GERADOR_APP ? 21 : 24}
          />
          <Text numberOfLines={commercialEnvironment ? 2 : 1} style={[styles.label, IS_GERADOR_APP && styles.generatorLabel]}>
            {tab.label}
          </Text>
        </Pressable>
      )})}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerFill: {
    backgroundColor: "#DFE8E3",
  },
  bar: {
    minHeight: 64,
    paddingTop: 5,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  label: {
    color: Colors.subtitle,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  generatorLabel: {
    fontSize: 8,
    lineHeight: 10,
  },
});
