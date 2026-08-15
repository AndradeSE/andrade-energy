import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";
import Divider from "../../components/ui/Divider";
import EmptyState from "../../components/ui/EmptyState";
import Loading from "../../components/ui/Loading";
import Screen from "../../components/ui/Screen";
import EconomiaChart from "../../components/cliente/EconomiaChart";
import { useDashboard } from "../../hooks/useDashboard";
import { Colors, Radius, Spacing, Typography } from "../../theme";

type HistoricoItem = {
  competencia?: string;
  economia?: number;
};

const formatarMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatarEnergia = (valor: number) =>
  `${Number(valor || 0).toLocaleString("pt-BR")} kWh`;

const formatarCompetencia = (competencia?: string) => {
  if (!competencia) return "Última competência";

  const [ano, mes] = competencia.split("-");
  if (!ano || !mes) return competencia;

  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(new Date(Number(ano), Number(mes) - 1, 1));
};

export default function Economia() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) return <Loading />;

  if (error || !data) {
    return (
      <Screen>
        <View style={styles.stateContainer}>
          <EmptyState
            icon="cloud-offline-outline"
            title="Não foi possível carregar sua economia"
            subtitle="Verifique sua conexão e tente novamente em alguns instantes."
          />
        </View>
      </Screen>
    );
  }

  const historico: HistoricoItem[] = Array.isArray(data.historico)
    ? data.historico
    : [];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SUA ENERGIA</Text>
            <Text style={styles.title}>Economia</Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons name="leaf-outline" size={24} color={Colors.primary} />
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Badge label="Desde o início do contrato" variant="success" />
          <Text style={styles.heroLabel}>Você já economizou</Text>
          <Text style={styles.heroValue}>
            {formatarMoeda(data.economiaAcumulada)}
          </Text>
          <View style={styles.heroFooter}>
            <View style={styles.heroIcon}>
              <Ionicons name="trending-up" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.heroFooterText}>
              {formatarMoeda(data.economiaMes)} nesta competência
            </Text>
          </View>
        </View>

        <View style={styles.documentActions}>
          <TouchableOpacity
            accessibilityLabel="Abrir faturas Andrade Energy"
            activeOpacity={0.84}
            onPress={() => router.push({ pathname: "/faturas", params: { categoria: "unificada" } })}
            style={styles.documentButton}
          >
            <View style={styles.documentIcon}><Ionicons name="documents-outline" size={24} color={Colors.primary} /></View>
            <Text style={styles.documentTitle}>Faturas</Text>
            <Text style={styles.documentSubtitle}>Andrade Energy</Text>
            <Ionicons name="chevron-forward" size={19} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Abrir contas de luz da concessionária"
            activeOpacity={0.84}
            onPress={() => router.push("/contas-de-luz")}
            style={styles.documentButton}
          >
            <View style={styles.documentIcon}><Ionicons name="flash-outline" size={24} color={Colors.primary} /></View>
            <Text style={styles.documentTitle}>Conta de luz</Text>
            <Text style={styles.documentSubtitle}>Concessionária</Text>
            <Ionicons name="chevron-forward" size={19} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Balanço energético</Text>
            <Text style={styles.sectionSubtitle}>
              {formatarCompetencia(data.ultimaFatura?.competencia)}
            </Text>
          </View>
          <Ionicons name="flash-outline" size={22} color={Colors.primary} />
        </View>

        <Card>
          <View style={styles.energyRow}>
            <View style={[styles.metricIcon, styles.solarIcon]}>
              <Ionicons name="sunny-outline" size={22} color="#D97706" />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Energia injetada</Text>
              <Text style={styles.metricHint}>Produzida e enviada à rede</Text>
            </View>
            <Text style={styles.metricValue}>
              {formatarEnergia(data.ultimaFatura?.energiaInjetada)}
            </Text>
          </View>

          <Divider />

          <View style={styles.energyRow}>
            <View style={[styles.metricIcon, styles.compensatedIcon]}>
              <Ionicons name="repeat-outline" size={22} color={Colors.primary} />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Energia compensada</Text>
              <Text style={styles.metricHint}>Abatida na sua fatura</Text>
            </View>
            <Text style={styles.metricValue}>
              {formatarEnergia(data.ultimaFatura?.energiaCompensada)}
            </Text>
          </View>

          <Divider />

          <View style={styles.energyRow}>
            <View style={[styles.metricIcon, styles.creditIcon]}>
              <Ionicons name="battery-half-outline" size={22} color={Colors.info} />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Saldo de créditos</Text>
              <Text style={styles.metricHint}>Disponível para compensação</Text>
            </View>
            <Text style={styles.metricValue}>{formatarEnergia(data.creditos)}</Text>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Evolução mensal</Text>
            <Text style={styles.sectionSubtitle}>Últimos lançamentos</Text>
          </View>
        </View>

        <EconomiaChart historico={historico} mostrarTitulo={false} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    color: Colors.primary,
    fontSize: Typography.small,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 4,
    color: Colors.text,
    fontSize: Typography.title,
    fontWeight: "800",
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.secondary,
  },
  heroBackground: {
    borderRadius: Radius.xl,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
  },
  heroGlow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -70,
    top: -80,
    backgroundColor: "rgba(15, 143, 91, 0.28)",
  },
  heroLabel: {
    marginTop: Spacing.lg,
    color: "#CBD5E1",
    fontSize: Typography.caption,
  },
  heroValue: {
    marginTop: Spacing.xs,
    color: Colors.surface,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  heroIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
  },
  heroFooterText: {
    marginLeft: Spacing.sm,
    color: "#E2E8F0",
    fontSize: Typography.caption,
    fontWeight: "600",
  },
  documentActions: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xl },
  documentButton: { minHeight: 122, flex: 1, alignItems: "flex-start", justifyContent: "center", padding: Spacing.md, borderRadius: Radius.xl, backgroundColor: "#D6D8DC" },
  documentIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surface },
  documentTitle: { color: Colors.text, fontSize: Typography.caption, fontWeight: "900" },
  documentSubtitle: { marginTop: 2, marginBottom: Spacing.xs, color: Colors.subtitle, fontSize: Typography.small },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: Typography.card,
    fontWeight: "700",
  },
  sectionSubtitle: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: Typography.caption,
  },
  energyRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  solarIcon: {
    backgroundColor: "#FFF7E6",
  },
  compensatedIcon: {
    backgroundColor: Colors.primaryLight,
  },
  creditIcon: {
    backgroundColor: "#EFF6FF",
  },
  metricContent: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  metricLabel: {
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "700",
  },
  metricHint: {
    marginTop: 3,
    color: Colors.subtitle,
    fontSize: Typography.small,
  },
  metricValue: {
    maxWidth: 100,
    color: Colors.text,
    fontSize: Typography.caption,
    fontWeight: "800",
    textAlign: "right",
  },
});
