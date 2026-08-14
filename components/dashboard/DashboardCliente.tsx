import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DashboardCard from "../DashboardCard";
import DashboardSection from "../DashboardSection";
import EconomiaCard from "../EconomiaCard";
import ProgressCard from "../ProgressCard";
import QuickActionCard from "../QuickActionCard";
import UltimaFaturaCard from "../UltimaFaturaCard";

import { useDashboard } from "../../hooks/useDashboard";

export default function DashboardCliente() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>
          Não foi possível carregar o dashboard.
        </Text>
      </SafeAreaView>
    );
  }

  const percentual =
    data.consumo > 0
      ? Math.min(
          100,
          Math.round((data.creditos / data.consumo) * 100)
        )
      : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>
          Bem-vindo 👋
        </Text>

        <Text style={styles.name}>
          {data.cliente}
        </Text>

        <EconomiaCard economia={data.economiaMes} />

        <DashboardSection
          titulo="Resumo"
          icone="📊"
        >
          <View style={styles.row}>
            <DashboardCard
              icone="⚡"
              titulo="Consumo"
              valor={`${data.consumo} kWh`}
            />

            <DashboardCard
              icone="🔋"
              titulo="Créditos"
              valor={`${data.creditos} kWh`}
            />
          </View>
        </DashboardSection>

        <ProgressCard
          titulo="Compensação da energia"
          percentual={percentual}
        />

        <DashboardSection
          titulo="Minha Unidade"
          icone="🏠"
        >
          <View style={styles.row}>
            <DashboardCard
              icone="🏠"
              titulo="UC"
              valor={data.uc}
            />

            <DashboardCard
              icone="🏢"
              titulo="Distribuidora"
              valor={data.distribuidora}
            />
          </View>
        </DashboardSection>

        <DashboardSection
          titulo="Última Fatura"
          icone="📄"
        >
          <UltimaFaturaCard
            competencia={data.ultimaFatura.competencia}
            valor={data.ultimaFatura.valor}
            vencimento={data.ultimaFatura.vencimento}
            onPress={() =>
              router.push(`/faturas/${data.ultimaFatura.id}`)
            }
          />
        </DashboardSection>

        <DashboardSection
          titulo="Ações rápidas"
          icone="⚡"
        >
          <View style={styles.row}>
            <QuickActionCard
              title="Faturas"
              icon={
                <Ionicons
                  name="document-text"
                  size={30}
                  color="#16A34A"
                />
              }
              onPress={() => router.push("/faturas")}
            />

            <QuickActionCard
              title="Contrato"
              icon={
                <Ionicons
                  name="document"
                  size={30}
                  color="#16A34A"
                />
              }
              onPress={() => router.push("/contrato")}
            />
          </View>
        </DashboardSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  greeting: {
    color: "#64748B",
    fontSize: 16,
  },

  name: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
    marginBottom: 22,
  },

  row: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
  },

  error: {
    color: "#DC2626",
    fontWeight: "600",
    fontSize: 16,
  },
});