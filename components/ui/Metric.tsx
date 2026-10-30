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
};

export default function Metric({
  title,
  value,
  subtitle,
  icon,
  compact = false,
}: Props) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      {icon && (
        <View style={styles.icon}>
          {icon}
        </View>
      )}

      <Text style={[styles.title, compact && styles.compactTitle]}>
        {title}
      </Text>

      <Text style={[styles.value, compact && styles.compactValue]}>
        {value}
      </Text>

      {subtitle ? (
        <Text style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.card,
  },

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
