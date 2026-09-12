import { LinearGradient } from "expo-linear-gradient";
import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "../../theme";

export const APP_TAB_BAR_METRICS = {
  height: 66,
  paddingTop: 5,
  paddingBottom: 3,
  radius: 24,
  itemMinHeight: 52,
} as const;

export default function AppTabBarFrame({ children }: PropsWithChildren) {
  return (
    <View style={styles.cornerFill}>
      <LinearGradient
        colors={["rgba(20, 54, 43, 0)", "rgba(20, 54, 43, 0.13)"]}
        locations={[0, 1]}
        pointerEvents="none"
        style={styles.topShadow}
      />
      <View style={styles.bar}>
        <LinearGradient
          colors={["#FFFFFF", "#F4F7F5", "#D9E1DD"]}
          locations={[0, 0.48, 1]}
          pointerEvents="none"
          style={styles.background}
        />
        {children}
      </View>
    </View>
  );
}

export const appTabBarStyles = StyleSheet.create({
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: APP_TAB_BAR_METRICS.itemMinHeight,
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

const styles = StyleSheet.create({
  cornerFill: {
    backgroundColor: "transparent",
    overflow: "visible",
    position: "relative",
  },
  topShadow: {
    position: "absolute",
    top: -14,
    left: 0,
    right: 0,
    height: 14,
  },
  bar: {
    height: APP_TAB_BAR_METRICS.height,
    paddingTop: APP_TAB_BAR_METRICS.paddingTop,
    paddingBottom: APP_TAB_BAR_METRICS.paddingBottom,
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopLeftRadius: APP_TAB_BAR_METRICS.radius,
    borderTopRightRadius: APP_TAB_BAR_METRICS.radius,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    overflow: "visible",
    elevation: 15,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: APP_TAB_BAR_METRICS.radius,
    borderTopRightRadius: APP_TAB_BAR_METRICS.radius,
  },
});
