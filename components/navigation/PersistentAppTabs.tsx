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
  { label: "Home", icon: "home-outline", route: "/(tabs)" },
  { label: "Clientes", icon: "people-outline", route: "/(tabs)/clientes" },
  { label: "Usinas", icon: "flash-outline", route: "/(tabs)/usinas" },
  { label: "Operação", icon: "construct-outline", route: "/(tabs)/operacao" },
  { label: "Faturas", icon: "receipt-outline", route: "/(tabs)/faturas" },
  { label: "Financeiro", icon: "cash-outline", route: "/(tabs)/financeiro" },
  { label: "Perfil", icon: "person-outline", route: "/(tabs)/perfil" },
];

const consumerTabs: TabItem[] = [
  { label: "Home", icon: "home-outline", route: "/(tabs)" },
  { label: "Economia", icon: "flash-outline", route: "/(tabs)/economia" },
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
      {tabs.map((tab) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={`Ir para ${tab.label}`}
          key={tab.label}
          onPress={() => router.replace(tab.route as never)}
          style={styles.item}
        >
          <Ionicons name={tab.icon} color={Colors.subtitle} size={IS_GERADOR_APP ? 21 : 24} />
          <Text numberOfLines={1} style={[styles.label, IS_GERADOR_APP && styles.generatorLabel]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 74,
    paddingTop: 8,
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
    gap: 3,
  },
  label: {
    color: Colors.subtitle,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  generatorLabel: {
    fontSize: 9,
    lineHeight: 12,
  },
});
