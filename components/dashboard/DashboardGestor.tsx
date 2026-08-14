import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, View } from "react-native";

import { useDashboardGestor } from "../../hooks/useDashboardGestor";
import { Colors, Spacing } from "../../theme";
import {
  AppHeader,
  EmptyState,
  Loading,
  Metric,
  Screen,
  Section,
} from "../ui";
import RevenueChart from "./RevenueChart";

function formatarEnergia(valor: number) {
  return `${Number(valor).toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  })} kWh`;
}

function formatarPercentual(valor: number) {
  return `${Number(valor).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function DashboardGestor() {
  const { data, isLoading, error } = useDashboardGestor();

  if (isLoading) return <Loading />;

  if (error || !data) {
    return (
      <Screen>
        <View style={styles.errorContent}>
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar a usina"
            subtitle="Verifique sua conexão e tente novamente em alguns instantes."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        contextSubtitle={`Competência ${data.competencia}`}
        contextTitle="Visão operacional"
        icon="business-outline"
        subtitle="Acompanhe o desempenho da usina"
        title={data.usina?.nome ?? "Minha usina"}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <Section title="Indicadores da usina">
          <View style={styles.grid}>
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
                title="Energia gerada"
                value={formatarEnergia(data.energiaGerada)}
              />
            </View>

            <View style={styles.metric}>
              <Metric
                compact
                icon={
                  <Ionicons
                    name="battery-half-outline"
                    size={20}
                    color={Colors.primary}
                  />
                }
                title="Energia disponível"
                value={formatarEnergia(data.energiaDisponivel)}
              />
            </View>

            <View style={styles.metric}>
              <Metric
                compact
                icon={
                  <Ionicons
                    name="pie-chart-outline"
                    size={20}
                    color={Colors.primary}
                  />
                }
                title="Ocupação"
                value={formatarPercentual(data.ocupacao)}
              />
            </View>

            <View style={styles.metric}>
              <Metric
                compact
                icon={
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={Colors.primary}
                  />
                }
                title="Clientes ativos"
                value={data.clientes}
              />
            </View>
          </View>
        </Section>

        <RevenueChart
          previsto={data.receitaPrevista}
          recebido={data.receitaRealizada}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },

  errorContent: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  metric: {
    width: "48%",
    marginBottom: Spacing.sm,
  },
});
