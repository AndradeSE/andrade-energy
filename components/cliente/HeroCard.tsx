import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";
import { Badge } from "../ui";

type Props = {
  saldo: number;
  economia: number;
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

export default function HeroCard({ saldo, economia }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.glowLarge} />
      <View style={styles.glowSmall} />

      <View style={styles.header}>
        <View style={styles.walletIcon}>
          <Ionicons name="flash" size={20} color={Colors.surface} />
        </View>
        <Badge label="Créditos ativos" variant="success" />
      </View>

      <Text style={styles.label}>Saldo disponível</Text>
      <Text style={styles.balance}>{formatarEnergia(saldo)}</Text>
      <Text style={styles.description}>Energia pronta para compensação</Text>

      <View style={styles.footer}>
        <View style={styles.footerIcon}>
          <Ionicons name="leaf-outline" size={18} color={Colors.primary} />
        </View>
        <View style={styles.footerContent}>
          <Text style={styles.footerLabel}>Economia acumulada</Text>
          <Text style={styles.footerValue}>{formatarMoeda(economia)}</Text>
        </View>
        <Ionicons name="trending-up" size={21} color="#86EFAC" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.secondary,
  },
  glowLarge: {
    position: "absolute",
    width: 220,
    height: 220,
    top: -105,
    right: -80,
    borderRadius: 110,
    backgroundColor: "rgba(15, 143, 91, 0.30)",
  },
  glowSmall: {
    position: "absolute",
    width: 110,
    height: 110,
    bottom: -60,
    left: -45,
    borderRadius: 55,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  walletIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  label: {
    marginTop: Spacing.lg,
    color: "#CBD5E1",
    fontSize: Typography.caption,
  },
  balance: {
    marginTop: 3,
    color: Colors.surface,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  description: {
    marginTop: Spacing.xs,
    color: "#94A3B8",
    fontSize: Typography.small,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  footerIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
  },
  footerContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  footerLabel: {
    color: "#CBD5E1",
    fontSize: Typography.small,
  },
  footerValue: {
    marginTop: 2,
    color: Colors.surface,
    fontSize: Typography.body,
    fontWeight: "800",
  },
});
