import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../theme";

type CommercialTab = "HOME" | "CARTEIRA" | "RECEITA";

export default function CommercialTabs({ active }: { active: CommercialTab }) {
  const insets = useSafeAreaInsets();
  const items = [
    {
      key: "HOME",
      icon: "home",
      outline: "home-outline",
      label: "Home",
      onPress: () => router.replace("/admin/comercial" as any),
    },
    {
      key: "CARTEIRA",
      icon: "wallet",
      outline: "wallet-outline",
      label: "Carteira",
      onPress: () =>
        router.replace({
          pathname: "/geradores/gestao",
          params: { aba: "ASSINATURAS" },
        } as any),
    },
    {
      key: "RECEITA",
      icon: "cash",
      outline: "cash-outline",
      label: "Receita mensal",
      onPress: () =>
        router.replace({
          pathname: "/geradores/gestao",
          params: { aba: "PAGAMENTOS" },
        } as any),
    },
  ] as const;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {items.map((item) => {
        const selected = active === item.key;
        return (
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            activeOpacity={0.78}
            key={item.key}
            onPress={item.onPress}
            style={styles.item}
          >
            <View
              style={[styles.indicator, selected && styles.indicatorActive]}
            />
            <Ionicons
              name={selected ? item.icon : item.outline}
              color={selected ? Colors.primary : "#94A3B8"}
              size={24}
            />
            <Text style={[styles.label, selected && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
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
    paddingTop: 8,
  },
  indicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "transparent",
  },
  indicatorActive: { backgroundColor: Colors.primary },
  label: {
    marginTop: 3,
    color: "#94A3B8",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  labelActive: { color: Colors.primary },
});
