import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { Colors, Spacing, Typography } from "../../theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
};

export default function MenuItem({ icon, label, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!onPress}
      onPress={onPress}
      style={styles.container}
    >
      <Ionicons name={icon} size={20} color={Colors.primary} />

      <Text style={styles.label}>{label}</Text>

      {onPress ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.subtitle}
        />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },

  label: {
    flex: 1,
    marginLeft: Spacing.md,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "600",
  },
});
