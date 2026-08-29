import {
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDashboard } from "../../hooks/useDashboard";
import { Colors, Radius, Shadows, Spacing, Typography } from "../../theme";

import EmptyState from "../ui/EmptyState";
import Card from "../ui/Card";
import Loading from "../ui/Loading";
import Screen from "../ui/Screen";
import { ElasticScrollView as ScrollView } from "../ui/ElasticScroll";

import ClienteHeader from "./ClienteHeader";
import EconomiaChart from "./EconomiaChart";
import EnergyFlowCard from "./EnergyFlowCard";
import QuickAccessCarousel from "../QuickAccessCarousel";

export default function ClienteHome() {
  const { data, isLoading, error, refetch } = useDashboard();
  const [atualizando, setAtualizando] = useState(false);
  async function atualizarPagina() {
    setAtualizando(true);
    try {
      await refetch();
    } finally {
      setAtualizando(false);
    }
  }

  if (isLoading) return <Loading />;

  if (error || !data) {
    return (
      <Screen>
        <View style={styles.errorContent}>
          <EmptyState
            icon="alert-circle-outline"
            title="Não foi possível carregar a sua energia"
            subtitle="Verifique sua conexão e tente novamente em alguns instantes."
          />
        </View>
      </Screen>
    );
  }

  const quantidadeEmAberto = Number(data.faturasEmAberto ?? 0);
  const valorEmAberto = Number(data.valorEmAberto ?? 0);
  const consumo = Number(data.consumo ?? 0);
  const creditos = Number(data.creditos ?? 0);
  const economiaMes = Number(data.economiaMes ?? 0);
  const economiaAcumulada = Number(data.economiaAcumulada ?? 0);
  const compensacao =
    consumo > 0 ? Math.min(100, Math.round((creditos / consumo) * 100)) : 0;
  const moeda = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const energia = (valor: number) =>
    `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kWh`;

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.screen}>
      <StatusBar backgroundColor="#006B3C" barStyle="light-content" />
      <ClienteHeader
        cliente={data.cliente}
        uc={data.uc}
        distribuidora={data.distribuidora}
        onOpenProfile={() => router.navigate("/perfil")}
      />

      <ScrollView
        style={styles.scroll}
        bounces
        alwaysBounceVertical
        overScrollMode="always"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={atualizarPagina}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.overviewHero}>
          <View style={styles.overviewCopy}>
            <Text style={styles.overviewEyebrow}>ECONOMIA ACUMULADA</Text>
            <Text style={styles.overviewValue}>{moeda(economiaAcumulada)}</Text>
            <Text style={styles.overviewCaption}>
              Sua energia gerando valor desde o início do contrato
            </Text>
            <View style={styles.monthSaving}>
              <Ionicons name="trending-up-outline" size={17} color="#A7F3D0" />
              <Text style={styles.monthSavingText}>
                {moeda(economiaMes)} nesta competência
              </Text>
            </View>
          </View>
          <View style={styles.compensationOrbit}>
            <Text style={styles.compensationValue}>{compensacao}%</Text>
            <Text style={styles.compensationLabel}>compensado</Text>
          </View>
        </View>

        <View style={styles.quickHeader}>
          <Text style={styles.quickTitle}>Acesso rápido</Text>
          <Text style={styles.quickHint}>Arraste para navegar</Text>
        </View>
        <QuickAccessCarousel
          items={[
            {
              icon: "receipt-outline",
              label: "Faturas",
              onPress: () => router.push("/faturas"),
            },
            {
              icon: "document-attach-outline",
              label: "Conta de luz",
              onPress: () => router.push("/contas-de-luz"),
            },
            {
              icon: "trending-up-outline",
              label: "Economia",
              onPress: () => router.push("/(tabs)/economia"),
            },
            {
              icon: "document-text-outline",
              label: "Contrato",
              onPress: () => router.push("/contrato"),
            },
            {
              icon: "search-outline",
              label: "Pesquisar",
              value: "Encontre qualquer área",
              onPress: () => router.push({ pathname: "/pesquisa", params: { perfil: "consumidor" } } as any),
            },
          ]}
        />

        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>Visão geral</Text>
          <Text style={styles.overviewHint}>Competência atual</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="flash-outline" size={19} color={Colors.primary} />
            </View>
            <Text style={styles.metricLabel}>Consumo</Text>
            <Text style={styles.metricValue}>{energia(consumo)}</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="sunny-outline" size={19} color={Colors.primary} />
            </View>
            <Text style={styles.metricLabel}>Créditos recebidos</Text>
            <Text style={styles.metricValue}>{energia(creditos)}</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="home-outline" size={19} color={Colors.primary} />
            </View>
            <Text style={styles.metricLabel}>Minha unidade</Text>
            <Text numberOfLines={1} style={styles.metricValue}>
              {String(data.uc ?? "—")}
            </Text>
            <Text numberOfLines={1} style={styles.metricNote}>
              {String(data.distribuidora ?? "Concessionária")}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => router.push("/faturas")}
            style={styles.metricCard}
          >
            <View style={styles.metricIcon}>
              <Ionicons
                name="receipt-outline"
                size={19}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.metricLabel}>Faturas pendentes</Text>
            <Text style={styles.metricValue}>{quantidadeEmAberto}</Text>
            <Text style={styles.metricNote}>{moeda(valorEmAberto)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.invoiceSectionHeader}>
          <Text style={styles.invoiceSectionTitle}>Faturas pendentes</Text>
          <TouchableOpacity onPress={() => router.push("/faturas")}>
            <Text style={styles.invoiceSeeAll}>VER TODOS</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          accessibilityLabel="Abrir faturas pendentes"
          activeOpacity={0.86}
          onPress={() => {
            const faturaId = data.ultimaFatura?.id;
            router.push(
              faturaId && quantidadeEmAberto > 0
                ? `/faturas/${faturaId}`
                : "/faturas/pagamento",
            );
          }}
        >
          <Card>
            <View style={styles.emptyInvoiceHeader}>
              <View style={styles.emptyInvoiceIcon}>
                <Ionicons
                  name="receipt-outline"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.emptyInvoiceContent}>
                <Text style={styles.emptyInvoiceEyebrow}>PENDÊNCIAS</Text>
                <Text style={styles.emptyInvoiceTitle}>
                  {quantidadeEmAberto}{" "}
                  {quantidadeEmAberto === 1 ? "fatura" : "faturas"}
                </Text>
              </View>
              <Text style={styles.emptyInvoiceValue}>
                {valorEmAberto.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Text>
            </View>
            <Text style={styles.emptyInvoiceHint}>
              {quantidadeEmAberto > 0
                ? "Consulte vencimentos, pagamentos e documentos disponíveis."
                : "Você não possui faturas pendentes no momento."}
            </Text>
          </Card>
        </TouchableOpacity>

        <EnergyFlowCard
          injecao={data.ultimaFatura?.energiaInjetada ?? 0}
          compensacao={data.ultimaFatura?.energiaCompensada ?? 0}
          economiaMes={data.economiaMes}
          economiaAcumulada={data.economiaAcumulada}
        />

        <EconomiaChart
          historico={Array.isArray(data.historico) ? data.historico : []}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  errorContent: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 3,
  },
  overviewHero: {
    minHeight: 188,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: "#063E31",
    ...Shadows.card,
  },
  overviewCopy: { flex: 1, paddingRight: Spacing.sm },
  overviewEyebrow: {
    color: "#86EFAC",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  overviewValue: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  overviewCaption: {
    marginTop: 4,
    color: "#CDEBDE",
    fontSize: Typography.small,
    lineHeight: 18,
  },
  monthSaving: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: Spacing.md,
  },
  monthSavingText: { color: "#A7F3D0", fontSize: 11, fontWeight: "800" },
  compensationOrbit: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 8,
    borderColor: "#22C979",
    borderRadius: 46,
    backgroundColor: "rgba(255,255,255,.07)",
  },
  compensationValue: { color: "#FFFFFF", fontSize: 23, fontWeight: "900" },
  compensationLabel: {
    marginTop: 1,
    color: "#BDEBD5",
    fontSize: 9,
    fontWeight: "700",
  },
  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  overviewTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  overviewHint: { color: Colors.subtitle, fontSize: 11, fontWeight: "600" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  metricCard: {
    width: "48%",
    minHeight: 128,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
  },
  metricIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
  },
  metricLabel: {
    marginTop: Spacing.sm,
    color: Colors.subtitle,
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    marginTop: 3,
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: "900",
  },
  metricNote: {
    marginTop: 3,
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  quickHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  quickTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  quickHint: { color: Colors.subtitle, fontSize: 11, fontWeight: "600" },
  invoiceSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  invoiceSectionTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  invoiceSeeAll: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  emptyInvoiceHeader: { flexDirection: "row", alignItems: "center" },
  emptyInvoiceIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
  },
  emptyInvoiceContent: { flex: 1, marginLeft: Spacing.sm },
  emptyInvoiceEyebrow: {
    color: Colors.subtitle,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  emptyInvoiceTitle: {
    marginTop: 3,
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyInvoiceValue: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  emptyInvoiceHint: {
    marginTop: Spacing.md,
    color: Colors.subtitle,
    fontSize: 12,
    lineHeight: 18,
  },
});
