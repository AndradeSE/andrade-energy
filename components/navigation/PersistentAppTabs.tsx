import { Ionicons } from "@expo/vector-icons";
import { router, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IS_GERADOR_APP } from "../../config/appVariant";
import { Colors } from "../../theme";

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

export default function PersistentAppTabs({ loggedIn }: { loggedIn: boolean }) {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const firstSegment = String(segments[0] ?? "");

  // As rotas principais já renderizam sua própria barra. Autenticação,
  // seleção de ambiente e gestão comercial também têm navegação própria.
  const hidden =
    !loggedIn ||
    firstSegment === "(tabs)" ||
    firstSegment === "(auth)" ||
    firstSegment === "admin" ||
    firstSegment === "geradores" ||
    firstSegment === "selecionar-unidade" ||
    firstSegment === "biometric-lock" ||
    firstSegment === "email-conectado";

  if (hidden) return null;

  const tabs = IS_GERADOR_APP ? generatorTabs : consumerTabs;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const featured = tab.label === "Home";
        return (
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={`Ir para ${tab.label}`}
          key={tab.label}
          onPress={() => router.replace(tab.route as never)}
          style={[styles.item, featured && styles.featuredItem]}
        >
          <View style={featured ? styles.featuredIcon : undefined}>
            <Ionicons name={tab.icon} color={featured ? "#FFFFFF" : Colors.subtitle} size={featured ? 25 : IS_GERADOR_APP ? 21 : 24} />
          </View>
          <Text numberOfLines={1} style={[styles.label, IS_GERADOR_APP && styles.generatorLabel]}>
            {tab.label}
          </Text>
        </Pressable>
      )})}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 52,
    paddingTop: 3,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
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
  featuredItem: { transform: [{ translateY: -8 }] },
  featuredIcon: {
    width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center",
    backgroundColor: "#12B981", elevation: 8, shadowColor: "#12B981", shadowOpacity: 0.3,
    shadowRadius: 9, shadowOffset: { width: 0, height: 5 },
  },
});
