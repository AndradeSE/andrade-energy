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
          color="#00A86B"
          curved
          data={[
            { label: "Prevista", value: Number(previsto) },
            { label: "Realizada", value: Number(recebido) },
          ]}
          dataPointsColor="#F2C500"
          dataPointsRadius={6}
          endFillColor="#00A86B"
          endOpacity={0.08}
          hideDataPoints={false}
          rulesColor={Colors.border}
          startFillColor="#16D887"
          startOpacity={0.42}
          thickness={4}
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
