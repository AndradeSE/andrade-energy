import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
    Colors,
    Radius,
    Shadows,
    Spacing,
    Typography,
} from "../../theme";

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
  variant?: "default" | "primary";
};

export default function Metric({
  title,
  value,
  subtitle,
  icon,
  compact = false,
  children,
  variant = "default",
}: Props) {
  const containerStyle = [styles.container, compact && styles.compact];
  const content = (
    <>
      {icon && (
        <View style={styles.icon}>
          {icon}
        </View>
      )}

      <Text style={[styles.title, compact && styles.compactTitle, variant === "primary" && styles.primaryLabel]}>
        {title}
      </Text>

      <Text style={[styles.value, compact && styles.compactValue, variant === "primary" && styles.primaryValue]}>
        {value}
      </Text>

      {subtitle ? (
        <Text style={[styles.subtitle, variant === "primary" && styles.primaryLabel]}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </>
  );
  return variant === "primary" ? (
    <LinearGradient colors={[Colors.primaryDark, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.8 }} style={containerStyle}>
      {content}
    </LinearGradient>
  ) : <View style={containerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },

  primaryLabel: { color: "#E1F4E9" },
  primaryValue: { color: "#FFFFFF" },

  compact: {
    minHeight: 128,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    shadowOpacity: 0,
    elevation: 0,
  },

  compactTitle: {
    minHeight: 32,
    lineHeight: 16,
  },

  icon: {
    marginBottom: Spacing.md,
  },

  title: {
    fontSize: Typography.caption,
    color: Colors.subtitle,
    marginBottom: 6,
  },

  value: {
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.text,
  },

  compactValue: {
    fontSize: Typography.body,
  },

  subtitle: {
    marginTop: 8,
    fontSize: Typography.small,
    color: Colors.subtitle,
  },
});
