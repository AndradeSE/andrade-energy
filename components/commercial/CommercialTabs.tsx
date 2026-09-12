import { router } from "expo-router";
import { Pressable, Text } from "react-native";
import { Colors } from "../../theme";
import AppTabIcon from "../navigation/AppTabIcon";
import { useAuth } from "../../contexts/AuthContext";
import AppTabBarFrame, { appTabBarStyles as styles } from "../navigation/AppTabBarFrame";

type CommercialTab = "HOME" | "GERADORES" | "PAGAMENTOS" | "PLANOS" | "ASSINATURAS";

export default function CommercialTabs({ active }: { active?: CommercialTab }) {
  const { user } = useAuth();
  const colaborador = user?.papel_empresa === "COLABORADOR_COMERCIAL";
  const items = [
    {
      key: "GERADORES",
      icon: "people-outline",
      label: "Geradores",
      onPress: () =>
        router.replace({
          pathname: "/geradores/gestao",
          params: { aba: "GERADORES" },
        } as any),
    },
    {
      key: "PAGAMENTOS",
      icon: "wallet-outline",
      label: "Financeiro",
      onPress: () =>
        router.replace({
          pathname: "/geradores/gestao",
          params: { aba: "PAGAMENTOS" },
        } as any),
    },
    {
      key: "HOME",
      icon: "home-outline",
      label: "Home",
      onPress: () => router.replace("/admin/comercial" as any),
    },
    {
      key: "PLANOS",
      icon: "pricetags-outline",
      label: "Planos",
      onPress: () =>
        router.replace({
          pathname: "/geradores/gestao",
          params: { aba: "PLANOS" },
        } as any),
    },
    {
      key: "ASSINATURAS",
      icon: "card-outline",
      label: "Assinaturas",
      onPress: () =>
        router.replace({
          pathname: "/geradores/gestao",
          params: { aba: "ASSINATURAS" },
        } as any),
    },
  ].filter((item) => !colaborador || ["GERADORES", "HOME"].includes(item.key)) as any[];

  return (
    <AppTabBarFrame>
      {items.map((item) => {
        const selected = active === item.key;
        const featured = item.key === "HOME";
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Ir para ${item.label}`}
            key={item.key}
            onPress={item.onPress}
            style={styles.item}
          >
            <AppTabIcon
              name={item.icon}
              color={selected ? Colors.primary : Colors.subtitle}
              featured={featured}
              size={22}
            />
            <Text style={[styles.label, selected && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </AppTabBarFrame>
  );
}
