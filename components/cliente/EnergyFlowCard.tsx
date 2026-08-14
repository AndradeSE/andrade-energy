import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";
import { Card, Divider } from "../ui";

type Props = {
  injecao: number;
  compensacao: number;
  economiaMes: number;
  economiaAcumulada: number;
};

function formatarEnergia(valor: number) {
  return `${Number(valor || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 0,
  })} kWh`;
}

function formatarMoeda(valor: number) {
  return Number(valor || 0).toLocaleString("pt-BR", {
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
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.title}>Fluxo de energia</Text>
          <Text style={styles.subtitle}>Resumo da última competência</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Atualizado</Text>
        </View>
      </View>

      <Card>
        <View style={styles.flow}>
          <View style={styles.flowItem}>
            <View style={[styles.flowIcon, styles.sunIcon]}>
              <Ionicons name="sunny" size={24} color="#D97706" />
            </View>
            <Text style={styles.flowLabel}>Injetada</Text>
            <Text style={styles.flowValue}>{formatarEnergia(injecao)}</Text>
          </View>

          <View style={styles.connector}>
            <View style={styles.connectorLine} />
            <View style={styles.connectorIcon}>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.flowItem}>
            <View style={[styles.flowIcon, styles.gridIcon]}>
              <Ionicons name="git-network-outline" size={23} color={Colors.info} />
            </View>
            <Text style={styles.flowLabel}>Rede</Text>
            <Text style={styles.flowHint}>Distribuidora</Text>
          </View>

          <View style={styles.connector}>
            <View style={styles.connectorLine} />
            <View style={styles.connectorIcon}>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </View>
          </View>

          <View style={styles.flowItem}>
            <View style={[styles.flowIcon, styles.homeIcon]}>
              <Ionicons name="home-outline" size={23} color={Colors.primary} />
            </View>
            <Text style={styles.flowLabel}>Compensada</Text>
            <Text style={styles.flowValue}>{formatarEnergia(compensacao)}</Text>
          </View>
        </View>

        <Divider />

        <View style={styles.savings}>
          <View style={styles.savingItem}>
            <Text style={styles.savingLabel}>Economia no mês</Text>
            <Text style={styles.savingValue}>{formatarMoeda(economiaMes)}</Text>
          </View>
          <View style={styles.savingDivider} />
          <View style={styles.savingItem}>
            <Text style={styles.savingLabel}>Total acumulado</Text>
            <Text style={styles.savingValue}>{formatarMoeda(economiaAcumulada)}</Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
  },
  liveDot: {
    width: 7,
    height: 7,
    marginRight: 6,
    borderRadius: Radius.round,
    backgroundColor: Colors.primary,
  },
  liveText: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: "800",
  },
  flow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  flowItem: {
    width: 76,
    alignItems: "center",
  },
  flowIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
  },
  sunIcon: {
    backgroundColor: "#FFF7E6",
  },
  gridIcon: {
    backgroundColor: "#EFF6FF",
  },
  homeIcon: {
    backgroundColor: Colors.primaryLight,
  },
  flowLabel: {
    marginTop: Spacing.sm,
    color: Colors.text,
    fontSize: Typography.small,
    fontWeight: "700",
    textAlign: "center",
  },
  flowValue: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  flowHint: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: 10,
    textAlign: "center",
  },
  connector: {
    flex: 1,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  connectorLine: {
    width: "100%",
    height: 2,
    backgroundColor: "#D1FAE5",
  },
  connectorIcon: {
    position: "absolute",
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: Colors.surface,
  },
  savings: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.sm,
  },
  savingItem: {
    flex: 1,
  },
  savingDivider: {
    width: 1,
    height: 42,
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.border,
  },
  savingLabel: {
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  savingValue: {
    marginTop: 4,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "800",
  },
});
