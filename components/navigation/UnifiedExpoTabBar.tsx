import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "../../theme";

export default function UnifiedExpoTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const routes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options as any;
    return options?.href !== null && options?.tabBarItemStyle?.display !== "none";
  });

  return (
    <View style={styles.cornerFill}>
      <View
        style={[
          styles.bar,
          { height: 66, paddingBottom: 3 },
        ]}
      >
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
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -5 },
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
