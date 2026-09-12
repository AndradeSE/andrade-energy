import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "../../theme";
import { IS_GERADOR_APP } from "../../config/appVariant";

export default function UnifiedExpoTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 3);
  const routes = state.routes.filter((route) => {
    const options = descriptors[route.key]?.options as any;
    return options?.href !== null && options?.tabBarItemStyle?.display !== "none";
  });

  return (
    <View style={styles.cornerFill}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={styles.surface} />
      </View>
      <View
        style={[
          styles.bar,
          { height: (IS_GERADOR_APP ? 63 : 61) + bottomInset, paddingBottom: bottomInset },
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
              style={[styles.item, !IS_GERADOR_APP && styles.consumerItem]}
            >
              {options.tabBarIcon?.({ focused, color, size: 21 })}
              <Text
                numberOfLines={1}
                style={[styles.label, !IS_GERADOR_APP && styles.consumerLabel, focused && styles.labelActive]}
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
  cornerFill: { backgroundColor: "#DFE8E3" },
  bar: {
    height: 66,
    paddingTop: 5,
    paddingBottom: 3,
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "transparent",
    overflow: "visible",
    elevation: 15,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  surface: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFFFFF",
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
  consumerItem: { minHeight: 50 },
  label: {
    color: Colors.subtitle,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  consumerLabel: {
    fontSize: 10,
    lineHeight: 12,
  },
  labelActive: { color: Colors.primary },
});
