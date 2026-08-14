import { LineChart } from "react-native-gifted-charts";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "../ui";
import { Colors, Spacing, Typography } from "../../theme";

type Props = {
  previsto: number;
  recebido: number;
};

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function RevenueChart({ previsto, recebido }: Props) {
  return (
    <Card>
      <Text style={styles.title}>Receita da competência</Text>

      <Text style={styles.subtitle}>
        Prevista {formatarMoeda(previsto)} · Realizada {formatarMoeda(recebido)}
      </Text>

      <View style={styles.chart}>
        <LineChart
          areaChart
          color={Colors.primary}
          curved
          data={[
            { label: "Prevista", value: Number(previsto) },
            { label: "Realizada", value: Number(recebido) },
          ]}
          dataPointsColor={Colors.primary}
          endFillColor={Colors.primary}
          endOpacity={0.04}
          hideDataPoints={false}
          rulesColor={Colors.border}
          startFillColor={Colors.primary}
          startOpacity={0.3}
          thickness={3}
          xAxisColor={Colors.border}
          yAxisColor={Colors.border}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
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

  chart: {
    marginTop: Spacing.lg,
  },
});
