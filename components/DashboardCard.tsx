import { StyleSheet, Text, View } from "react-native";

import {
  Colors,
  Radius,
  Shadows,
  Spacing,
  Typography,
} from "../theme";

type Props = {
  titulo: string;
  valor: string | number;
  icone?: string;
};

export default function DashboardCard({ titulo, valor, icone }: Props) {
  return (
    <View style={styles.container}>
      {icone ? <Text style={styles.icon}>{icone}</Text> : null}

      <Text style={styles.title}>{titulo}</Text>

      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.value}>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "48%",
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    ...Shadows.card,
  },

  icon: {
    fontSize: 28,
  },

  title: {
    marginTop: Spacing.xs,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },

  value: {
    marginTop: Spacing.xs,
    color: Colors.text,
    fontSize: Typography.card,
    fontWeight: "700",
  },
});
