import { StyleSheet, Text, View } from "react-native";

import { Colors, Spacing, Typography } from "../../theme";
import { Metric } from "../ui";

type Props = {
  saldo: number;
  economia: number;
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

export default function HeroCard({ saldo, economia }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carteira de créditos</Text>

      <Text style={styles.subtitle}>
        Acompanhe sua energia disponível para compensação.
      </Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Metric
            compact
            title="Saldo atual"
            value={formatarEnergia(saldo)}
          />
        </View>

        <View style={styles.metric}>
          <Metric
            compact
            title="Economia acumulada"
            value={formatarMoeda(economia)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
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

  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
  },

  metric: {
    width: "48%",
  },
});
