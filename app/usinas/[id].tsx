import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EconomiaCard from "../../components/EconomiaCard";
import StatCard from "../../components/StatCard";
import { useDashboardUsina } from "../../hooks/useDashboardUsina";

export default function DashboardUsina() {
  const { id } = useLocalSearchParams();

  const { data, isLoading, error } =
    useDashboardUsina(id as string);

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
        <Text>Erro ao carregar usina.</Text>
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
            fontSize: 28,
            fontWeight: "bold",
            marginBottom: 24,
          }}
        >
          Dashboard da Usina
        </Text>

        <View style={{ flexDirection: "row", gap: 16 }}>
          <StatCard
            titulo="⚡ Gerada"
            valor={`${data.energia.gerada} kWh`}
          />

          <StatCard
            titulo="🔌 Injetada"
            valor={`${data.energia.injetada} kWh`}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 16 }}>
          <StatCard
            titulo="💡 Compensada"
            valor={`${data.energia.compensada} kWh`}
          />

          <StatCard
            titulo="🟢 Excedente"
            valor={`${data.energia.excedente} kWh`}
          />
        </View>

        <EconomiaCard
          economia={data.financeiro.receita}
        />
      </ScrollView>
    </SafeAreaView>
  );
}