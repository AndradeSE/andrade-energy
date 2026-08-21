import { RefreshControl, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDashboard } from "../../hooks/useDashboard";
import { Colors, Spacing } from "../../theme";

import EmptyState from "../ui/EmptyState";
import Card from "../ui/Card";
import Loading from "../ui/Loading";
import Screen from "../ui/Screen";
import { ElasticScrollView as ScrollView } from "../ui/ElasticScroll";

import ClienteHeader from "./ClienteHeader";
import EconomiaChart from "./EconomiaChart";
import EnergyFlowCard from "./EnergyFlowCard";
import HeroCard from "./HeroCard";
import QuickAccessCarousel from "../QuickAccessCarousel";

export default function ClienteHome() {
  const { data, isLoading, error, refetch } = useDashboard();
  const [atualizando, setAtualizando] = useState(false);
  async function atualizarPagina() { setAtualizando(true); try { await refetch(); } finally { setAtualizando(false); } }

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
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizarPagina} tintColor={Colors.primary} colors={[Colors.primary]} />}
        contentContainerStyle={styles.content}
      >
        <HeroCard
          saldo={data.creditos}
          economia={data.economiaAcumulada}
        />

        <View style={styles.quickHeader}><Text style={styles.quickTitle}>Acesso rápido</Text><Text style={styles.quickHint}>Arraste para navegar</Text></View>
        <QuickAccessCarousel items={[
          { icon: "receipt-outline", label: "Faturas", onPress: () => router.push("/faturas") },
          { icon: "document-attach-outline", label: "Conta de luz", onPress: () => router.push("/contas-de-luz") },
          { icon: "trending-up-outline", label: "Economia", onPress: () => router.push("/(tabs)/economia") },
          { icon: "document-text-outline", label: "Contrato", onPress: () => router.push("/contrato") },
        ]} />

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
            router.push(faturaId && quantidadeEmAberto > 0 ? `/faturas/${faturaId}` : "/faturas/pagamento");
          }}
        >
          <Card>
            <View style={styles.emptyInvoiceHeader}>
              <View style={styles.emptyInvoiceIcon}><Ionicons name="receipt-outline" size={22} color={Colors.primary} /></View>
              <View style={styles.emptyInvoiceContent}>
                <Text style={styles.emptyInvoiceEyebrow}>PENDÊNCIAS</Text>
                <Text style={styles.emptyInvoiceTitle}>{quantidadeEmAberto} {quantidadeEmAberto === 1 ? "fatura" : "faturas"}</Text>
              </View>
              <Text style={styles.emptyInvoiceValue}>{valorEmAberto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
            </View>
            <Text style={styles.emptyInvoiceHint}>{quantidadeEmAberto > 0 ? "Consulte vencimentos, pagamentos e documentos disponíveis." : "Você não possui faturas pendentes no momento."}</Text>
          </Card>
        </TouchableOpacity>

        <EnergyFlowCard
          injecao={data.ultimaFatura?.energiaInjetada ?? 0}
          compensacao={data.ultimaFatura?.energiaCompensada ?? 0}
          economiaMes={data.economiaMes}
          economiaAcumulada={data.economiaAcumulada}
        />

        <EconomiaChart
          historico={
            Array.isArray(data.historico) ? data.historico : []
          }
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
  quickHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.xs, marginBottom: Spacing.sm },
  quickTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  quickHint: { color: Colors.subtitle, fontSize: 11, fontWeight: "600" },
  invoiceSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.xs, marginBottom: Spacing.sm },
  invoiceSectionTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  invoiceSeeAll: { color: Colors.primary, fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },
  emptyInvoiceHeader: { flexDirection: "row", alignItems: "center" },
  emptyInvoiceIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: Colors.primaryLight },
  emptyInvoiceContent: { flex: 1, marginLeft: Spacing.sm },
  emptyInvoiceEyebrow: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: 0.7 },
  emptyInvoiceTitle: { marginTop: 3, color: Colors.text, fontSize: 18, fontWeight: "800" },
  emptyInvoiceValue: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  emptyInvoiceHint: { marginTop: Spacing.md, color: Colors.subtitle, fontSize: 12, lineHeight: 18 },
});
