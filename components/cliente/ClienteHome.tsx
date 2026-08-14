import { ScrollView, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useDashboard } from "../../hooks/useDashboard";
import { Colors, Spacing } from "../../theme";

import EmptyState from "../ui/EmptyState";
import Loading from "../ui/Loading";
import Screen from "../ui/Screen";

import RecentActivity from "../cliente/RecentActivity";
import ClienteHeader from "./ClienteHeader";
import EconomiaChart from "./EconomiaChart";
import EnergyFlowCard from "./EnergyFlowCard";
import HeroCard from "./HeroCard";
import NextInvoiceCard from "./NextInvoiceCard";

export default function ClienteHome() {
  const navigation = useNavigation();
  const { data, isLoading, error } = useDashboard();

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

  const possuiUltimaFatura = Boolean(
    data.ultimaFatura?.competencia || data.ultimaFatura?.vencimento
  );

  return (
    <Screen>
      <ClienteHeader
        cliente={data.cliente}
        uc={data.uc}
        distribuidora={data.distribuidora}
        onOpenProfile={() => navigation.navigate("Perfil" as never)}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <HeroCard
          saldo={data.creditos}
          economia={data.economiaAcumulada}
        />

        {possuiUltimaFatura ? (
          <NextInvoiceCard
            competencia={data.ultimaFatura?.competencia ?? ""}
            valor={data.ultimaFatura?.valor ?? 0}
            vencimento={data.ultimaFatura?.vencimento ?? ""}
            status="Em aberto"
          />
        ) : null}

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

        <RecentActivity />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
