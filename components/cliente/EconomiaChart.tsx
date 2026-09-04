import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";
import { Card, EmptyState } from "../ui";

const CORES_BARRAS = ["#00A86B", "#00A7A0", "#2F80ED", "#7C5CFC", "#FF8A00", "#F2C500"];

type HistoricoItem = {
  competencia?: string;
  economia?: number;
};

type Props = {
  historico: HistoricoItem[];
  mostrarTitulo?: boolean;
};

function formatarCompetencia(competencia?: string) {
  if (!competencia) return "Mês";

  const [ano, mes] = competencia.split("-");
  if (!ano || !mes) return competencia;

  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(Number(ano), Number(mes) - 1, 1))
    .replace(".", "");
}

export default function EconomiaChart({
  historico,
  mostrarTitulo = true,
}: Props) {
  if (historico.length === 0) {
    return (
      <EmptyState
        icon="bar-chart-outline"
        title="Histórico em formação"
        subtitle="Sua evolução mensal aparecerá após o primeiro fechamento."
      />
    );
  }

  const itens = historico.slice(-6);
  const maiorEconomia = Math.max(
    ...itens.map((item) => Number(item.economia ?? 0)),
    1
  );

  return (
    <View style={styles.container}>
      {mostrarTitulo ? (
        <View style={styles.header}>
          <Text style={styles.title}>Evolução da economia</Text>
          <Text style={styles.subtitle}>Últimas seis competências</Text>
        </View>
      ) : null}

      <Card>
        <View style={styles.chart}>
          {itens.map((item, index) => {
            const economia = Number(item.economia ?? 0);
            const altura = Math.max((economia / maiorEconomia) * 112, 8);

            return (
              <View
                key={`${item.competencia ?? "mes"}-${index}`}
                style={styles.column}
              >
                <Text numberOfLines={1} style={[styles.value, { color: CORES_BARRAS[index % CORES_BARRAS.length] }]}>
                  {economia.toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.bar, { height: altura, backgroundColor: CORES_BARRAS[index % CORES_BARRAS.length] }]} />
                </View>
                <Text style={styles.label}>
                  {formatarCompetencia(item.competencia)}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.caption}>Economia em reais por competência</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.card,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
  chart: {
    height: 162,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  value: {
    width: "100%",
    marginBottom: 6,
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  track: {
    height: 112,
    justifyContent: "flex-end",
    paddingHorizontal: 3,
    borderRadius: Radius.round,
    backgroundColor: "#E8F1EC",
  },
  bar: {
    width: 20,
    borderRadius: Radius.round,
    shadowColor: "#0B5D3C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    marginTop: 7,
    color: Colors.subtitle,
    fontSize: 10,
    textTransform: "capitalize",
  },
  caption: {
    marginTop: Spacing.md,
    color: Colors.subtitle,
    fontSize: Typography.small,
    textAlign: "center",
  },
});
