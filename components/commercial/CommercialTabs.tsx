import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../theme";
import AppTabIcon from "../navigation/AppTabIcon";

type CommercialTab = "HOME" | "GERADORES" | "PAGAMENTOS" | "PLANOS" | "ASSINATURAS";

export default function CommercialTabs({ active }: { active?: CommercialTab }) {
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
  ] as const;

  return (
    <View style={styles.cornerFill}>
      <LinearGradient colors={["#FFFFFF", "#EEF2F0"]} locations={[0, 1]} style={styles.bar}>
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
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerFill: {
    backgroundColor: "#DFE8E3",
  },
  bar: {
    height: 66,
    paddingTop: 5,
    paddingBottom: 3,
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "transparent",
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
  labelActive: { color: Colors.primary },
});
