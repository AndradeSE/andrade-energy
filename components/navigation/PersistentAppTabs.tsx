import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.15)"]}
        pointerEvents="none"
        style={styles.topShadow}
      />
      <LinearGradient
        colors={["#FFFFFF", "#EEF2F0"]}
        locations={[0, 1]}
        style={[
          styles.bar,
          { height: 66, paddingBottom: 3 },
        ]}
      >
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
            size={22}
          />
          <Text
            numberOfLines={commercialEnvironment ? 2 : 1}
            style={styles.label}
          >
            {tab.label}
          </Text>
        </Pressable>
      )})}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerFill: {
    backgroundColor: "#DFE8E3",
    overflow: "visible",
  },
  topShadow: {
    position: "absolute",
    top: -14,
    left: 0,
    right: 0,
    height: 14,
  },
  bar: {
    height: 66,
    paddingTop: 5,
    paddingBottom: 3,
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    overflow: "visible",
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -5 },
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingHorizontal: 0,
    paddingVertical: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: Colors.subtitle,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700",
    marginBottom: 0,
    textAlign: "center",
  },
});
