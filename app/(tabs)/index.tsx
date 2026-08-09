import { router } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EconomiaCard from "../../components/EconomiaCard";
import StatCard from "../../components/StatCard";
import UltimaFaturaCard from "../../components/UltimaFaturaCard";
import { useDashboard } from "../../hooks/useDashboard";

export default function Home() {
 const { data, isLoading, error } =
  useDashboard();

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.greeting}>
          Bem-vindo
        </Text>

        <Text style={styles.name}>
          {data.cliente}
        </Text>

        <EconomiaCard
          economia={data.economiaMes}
        />

        <View style={styles.stats}>
          <StatCard
            titulo="⚡ Consumo"
            valor={`${data.consumo} kWh`}
          />

          <StatCard
            titulo="🔋 Créditos"
            valor={`${data.creditos} kWh`}
          />
        </View>

        <View style={styles.stats}>
          <StatCard
            titulo="🏠 UC"
            valor={data.uc}
          />

          <StatCard
            titulo="🏢 Distribuidora"
            valor={data.distribuidora}
          />
        </View>

        <UltimaFaturaCard
          competencia={
            data.ultimaFatura.competencia
          }
          valor={
            data.ultimaFatura.valor
          }
          vencimento={
            data.ultimaFatura.vencimento
          }
          onPress={() =>
            router.push({
              pathname: "/faturas/[id]",
              params: {
                id: data.ultimaFatura.id,
              },
            })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
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
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 4,
    marginBottom: 24,
  },

  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 18,
  },

  error: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
});