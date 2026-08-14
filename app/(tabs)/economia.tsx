import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text } from "react-native";

import Card from "../../components/ui/Card";
import Divider from "../../components/ui/Divider";
import Loading from "../../components/ui/Loading";
import Metric from "../../components/ui/Metric";
import Screen from "../../components/ui/Screen";

import { useDashboard } from "../../hooks/useDashboard";

import {
    Colors,
    Spacing,
    Typography,
} from "../../theme";

export default function Economia() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return <Loading />;
  }

  if (error || !data) {
    return <Screen />;
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Energia</Text>

        <Text style={styles.subtitle}>
          Fluxo energético da última competência
        </Text>

        <Card>
          <Metric
            title="Energia Injetada"
            value={`${Number(
              data.ultimaFatura?.energiaInjetada ?? 0
            ).toLocaleString("pt-BR")} kWh`}
            subtitle="Energia produzida"
            icon={
              <Ionicons
                name="sunny"
                size={30}
                color="#F59E0B"
              />
            }
          />

          <Divider />

          <Metric
            title="Energia Compensada"
            value={`${Number(
              data.ultimaFatura?.energiaCompensada ?? 0
            ).toLocaleString("pt-BR")} kWh`}
            subtitle="Compensada na fatura"
            icon={
              <Ionicons
                name="flash"
                size={30}
                color={Colors.primary}
              />
            }
          />

          <Divider />

          <Metric
            title="Saldo de Créditos"
            value={`${Number(
              data.creditos
            ).toLocaleString("pt-BR")} kWh`}
            subtitle="Disponível"
            icon={
              <Ionicons
                name="battery-half"
                size={30}
                color="#2563EB"
              />
            }
          />
        </Card>

        <Card>
          <Text style={styles.section}>
            Economia acumulada
          </Text>

          <Text style={styles.money}>
            R${" "}
            {Number(
              data.economiaAcumulada
            ).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </Text>

          <Text style={styles.legend}>
            Valor economizado desde o início do contrato.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },

  title: {
    fontSize: 34,
    fontWeight: "700",
    color: Colors.text,
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    fontSize: Typography.body,
    color: Colors.subtitle,
  },

  section: {
    fontSize: Typography.section,
    fontWeight: "700",
    color: Colors.text,
  },

  money: {
    marginTop: 14,
    fontSize: 42,
    fontWeight: "700",
    color: Colors.primary,
  },

  legend: {
    marginTop: 8,
    fontSize: Typography.body,
    color: Colors.subtitle,
    lineHeight: 22,
  },
});