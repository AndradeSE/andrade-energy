import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../theme";
import AppTabIcon from "../navigation/AppTabIcon";
import { useAuth } from "../../contexts/AuthContext";

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
    <View style={styles.cornerFill}>
      <LinearGradient
        colors={["rgba(15,23,42,0)", "rgba(15,23,42,0.20)"]}
        locations={[0, 1]}
        pointerEvents="none"
        style={styles.shadowHalo}
      />
      <View style={styles.bar}>
      <LinearGradient colors={["#FFFFFF", "#DCE3DF"]} locations={[0, 1]} pointerEvents="none" style={styles.barBackground} />
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerFill: {
    backgroundColor: "transparent",
    overflow: "visible",
  },
  shadowHalo: {
    position: "absolute",
    top: -14,
    left: 5,
    right: 5,
    height: 22,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  barBackground: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
