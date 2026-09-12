import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";

export default function UnifiedExpoTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { user } = useAuth();
  const colaborador = String(user?.papel_empresa ?? "").startsWith("COLABORADOR_");
  const routes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options as any;
    return options?.href !== null && options?.tabBarItemStyle?.display !== "none" && (!colaborador || route.name !== "financeiro");
  });

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
        {routes.map((route) => {
          const routeIndex = state.routes.findIndex((item) => item.key === route.key);
          const focused = state.index === routeIndex;
          const options = descriptors[route.key].options;
          const label = String(options.tabBarLabel ?? options.title ?? route.name);
          const color = focused ? Colors.primary : Colors.subtitle;

          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? `Ir para ${label}`}
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
          style={styles.item}
            >
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              <Text
                numberOfLines={1}
                style={[styles.label, focused && styles.labelActive]}
              >
                {label}
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
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
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
    textAlign: "center",
  },
  labelActive: { color: Colors.primary },
});
