import { Ionicons } from "@expo/vector-icons";
import { router, useGlobalSearchParams, useSegments } from "expo-router";
import { Pressable, Text } from "react-native";

import { IS_GERADOR_APP } from "../../config/appVariant";
import { Colors } from "../../theme";
import AppTabIcon from "./AppTabIcon";
import { useAuth } from "../../contexts/AuthContext";
import CommercialTabs, { CommercialTab } from "../commercial/CommercialTabs";
import AppTabBarFrame, { appTabBarStyles as styles } from "./AppTabBarFrame";

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
  const { user } = useAuth();
  const segments = useSegments();
  const params = useGlobalSearchParams<{ ambiente?: string; aba?: string }>();
  const firstSegment = String(segments[0] ?? "");
  const secondSegment = String(segments[1] ?? "");
  const hidden =
    !loggedIn ||
    firstSegment === "(tabs)" ||
    firstSegment === "(auth)" ||
    (firstSegment === "admin" && secondSegment === "escolher-area") ||
    (firstSegment === "admin" && secondSegment === "empresas") ||
    firstSegment === "selecionar-unidade" ||
    firstSegment === "selecionar-gerador" ||
    firstSegment === "biometric-lock";

  if (hidden) return null;

  const commercialEnvironment = IS_GERADOR_APP && (
    firstSegment === "admin" ||
    firstSegment === "geradores" ||
    (firstSegment === "colaboradores" && (params.ambiente === "comercial" || user?.perfil === "ADMIN"))
  );
  if (commercialEnvironment) {
    let active: CommercialTab | undefined;
    if (firstSegment === "admin" && secondSegment === "comercial") active = "HOME";
    if (firstSegment === "geradores" && secondSegment === "gestao") {
      active = params.aba === "ASSINATURAS"
        ? "ASSINATURAS"
        : params.aba === "PAGAMENTOS"
          ? "PAGAMENTOS"
          : params.aba === "PLANOS"
            ? "PLANOS"
            : "GERADORES";
    }
    if (firstSegment === "geradores" && secondSegment === "monitoramento") active = "GERADORES";
    return <CommercialTabs active={active} />;
  }

  const baseTabs = IS_GERADOR_APP
      ? generatorTabs
      : consumerTabs;
  const colaborador = String(user?.papel_empresa ?? "").startsWith("COLABORADOR_");
  const tabs = colaborador ? baseTabs.filter((tab) => tab.label !== "Financeiro") : baseTabs;

  return (
    <AppTabBarFrame>
      {tabs.map((tab) => {
        const featured = tab.label === "Home";
        return (
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={`Ir para ${tab.label}`}
          key={tab.label}
          onPress={() => router.push(tab.route as never)}
          style={styles.item}
        >
          <AppTabIcon
            name={tab.icon}
            color={Colors.subtitle}
            featured={featured}
            size={22}
          />
          <Text
            numberOfLines={1}
            style={styles.label}
          >
            {tab.label}
          </Text>
        </Pressable>
      )})}
    </AppTabBarFrame>
  );
}
