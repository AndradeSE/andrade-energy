import { router } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EconomiaCard from "../../components/EconomiaCard";
import StatCard from "../../components/StatCard";
import UltimaFaturaCard from "../../components/UltimaFaturaCard";
import { useDashboard } from "../../hooks/useDashboard";

export default function Home() {
  const { data, isLoading, error } = useDashboard(
    "16b9bf33-eb44-4585-b941-99ae0210c277"
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Erro ao carregar dashboard.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#F8FAFC",
      }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            color: "#64748B",
          }}
        >
          Boa noite 👋
        </Text>

        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            marginTop: 4,
            marginBottom: 24,
          }}
        >
          {data.cliente}
        </Text>

        <EconomiaCard economia={data.economiaMes} />

        <View
          style={{
            flexDirection: "row",
            gap: 16,
          }}
        >
          <StatCard
            titulo="⚡ Consumo"
            valor={`${data.consumo} kWh`}
          />

          <StatCard
            titulo="🔋 Créditos"
            valor={`${data.creditos} kWh`}
          />
        </View>

       <UltimaFaturaCard
  competencia={data.ultimaFatura.competencia}
  valor={data.ultimaFatura.valor}
  vencimento={data.ultimaFatura.vencimento}
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