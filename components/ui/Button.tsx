import { ReactNode } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
} from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";

type Props = TouchableOpacityProps & {
  title: string;
  icon?: ReactNode;
};

export default function Button({
  title,
  icon,
  style,
  disabled,
  ...rest
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled, style]}
      {...rest}
    >
      {icon}

      <Text style={styles.text}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
  },
  disabled: { opacity: 0.42 },

  text: {
    color: "#FFF",
    fontSize: Typography.body,
    fontWeight: "700",
    marginLeft: 8,
  },
});
