import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../theme";
import AppTabIcon from "../navigation/AppTabIcon";

type CommercialTab = "HOME" | "GERADORES" | "ASSINATURAS";

export default function CommercialTabs({ active }: { active?: CommercialTab }) {
  const insets = useSafeAreaInsets();
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
      key: "HOME",
      icon: "home-outline",
      label: "Home",
      onPress: () => router.replace("/admin/comercial" as any),
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
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 3) }]}>
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
  labelActive: { color: Colors.primary },
});
