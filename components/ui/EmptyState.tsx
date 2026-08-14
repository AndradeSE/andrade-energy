import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import {
    Colors,
    Radius,
    Shadows,
    Spacing,
    Typography,
} from "../../theme";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
};

export default function EmptyState({
  icon = "folder-open-outline",
  title,
  subtitle,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon}
          size={46}
          color={Colors.primary}
        />
      </View>

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.subtitle}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    ...Shadows.card,
  },

  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  title: {
    fontSize: Typography.card,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },

  subtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.body,
    color: Colors.subtitle,
    textAlign: "center",
    lineHeight: 22,
  },
});