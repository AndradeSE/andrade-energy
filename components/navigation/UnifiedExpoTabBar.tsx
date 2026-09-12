import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text } from "react-native";

import { Colors } from "../../theme";
import { useAuth } from "../../contexts/AuthContext";
import AppTabBarFrame, { appTabBarStyles as styles } from "./AppTabBarFrame";

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
    <AppTabBarFrame>
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
    </AppTabBarFrame>
  );
}
