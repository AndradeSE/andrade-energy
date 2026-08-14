import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Spacing, Typography } from "../../theme";
import { Metric } from "../ui";

type Props = {
  injecao: number;
  compensacao: number;
  economiaMes: number;
  economiaAcumulada: number;
};

function formatarEnergia(valor: number) {
  return `${Number(valor).toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  })} kWh`;
}

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function EnergyFlowCard({
  injecao,
  compensacao,
  economiaMes,
  economiaAcumulada,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Resumo energético</Text>

      <Text style={styles.subtitle}>
        Indicadores da sua última leitura.
      </Text>

      <View style={styles.grid}>
        <View style={styles.metric}>
          <Metric
            compact
            icon={
              <Ionicons
                name="wallet-outline"
                size={20}
                color={Colors.primary}
              />
            }
            title="Economia acumulada"
            value={formatarMoeda(economiaAcumulada)}
          />
        </View>

        <View style={styles.metric}>
          <Metric
            compact
            icon={
              <Ionicons
                name="trending-down-outline"
                size={20}
                color={Colors.primary}
              />
            }
            title="Economia no mês"
            value={formatarMoeda(economiaMes)}
          />
        </View>

        <View style={styles.metric}>
          <Metric
            compact
            icon={
              <Ionicons
                name="sunny-outline"
                size={20}
                color={Colors.primary}
              />
            }
            title="Energia injetada"
            value={formatarEnergia(injecao)}
          />
        </View>

        <View style={styles.metric}>
          <Metric
            compact
            icon={
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color={Colors.primary}
              />
            }
            title="Energia compensada"
            value={formatarEnergia(compensacao)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
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

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
  },

  metric: {
    width: "48%",
    marginBottom: Spacing.sm,
  },
});
