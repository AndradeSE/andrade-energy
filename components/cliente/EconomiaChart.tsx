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

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function parseCompetencia(competencia?: string) {
  const texto = competencia?.trim() ?? "";
  const iso = /^(\d{4})-(\d{1,2})(?:-\d{2}(?:T.*)?)?$/.exec(texto);
  const local = /^(\d{1,2})\/(\d{4})$/.exec(texto);
  const ano = Number(iso?.[1] ?? local?.[2]);
  const mes = Number(iso?.[2] ?? local?.[1]);
  if (!ano || mes < 1 || mes > 12 || !mes) return null;
  return { ordem: ano * 12 + mes, rotulo: MESES[mes - 1] + "/" + String(ano).slice(-2) };
}

export default function EconomiaChart({
  historico,
  mostrarTitulo = true,
}: Props) {
  const itens = historico.flatMap((item) => {
    const competencia = parseCompetencia(item.competencia);
    return competencia ? [{ ...item, ...competencia }] : [];
  }).sort((a, b) => a.ordem - b.ordem).slice(-6);

  if (itens.length === 0) {
    return (
      <EmptyState
        icon="bar-chart-outline"
        title="Histórico em formação"
        subtitle="Sua evolução mensal aparecerá após o primeiro fechamento."
      />
    );
  }


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

      <Card style={styles.card}>
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
                  {item.rotulo}
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
  card: {
    backgroundColor: Colors.surface,
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
