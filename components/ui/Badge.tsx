import { StyleSheet, Text, View } from "react-native";

import {
    Colors,
    Radius,
    Spacing,
    Typography,
} from "../../theme";

type Variant =
  | "success"
  | "warning"
  | "danger"
  | "info";

type Props = {
  label: string;
  variant?: Variant;
};

export default function Badge({
  label,
  variant = "info",
}: Props) {
  const background = {
    success: "#DCFCE7",
    warning: "#FEF3C7",
    danger: "#FEE2E2",
    info: "#DBEAFE",
  }[variant];

  const color = {
    success: Colors.success,
    warning: Colors.warning,
    danger: Colors.danger,
    info: Colors.info,
  }[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: background,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.round,
  },

  label: {
    fontSize: Typography.caption,
    fontWeight: "700",
  },
});