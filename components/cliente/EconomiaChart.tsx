import { StyleSheet, Text, View } from "react-native";

import { Colors, Spacing, Typography } from "../../theme";
import { Card } from "../ui";

type Props = {
  historico: unknown[];
};

export default function EconomiaChart({ historico }: Props) {
  if (historico.length === 0) {
    return null;
  }

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.title}>Evolução da economia</Text>

        <Text style={styles.subtitle}>
          Seu histórico mensal está disponível.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: Spacing.xxl,
    justifyContent: "center",
  },

  title: {
    color: Colors.text,
    fontSize: Typography.card,
    fontWeight: "700",
  },

  subtitle: {
    marginTop: Spacing.xs,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
});
