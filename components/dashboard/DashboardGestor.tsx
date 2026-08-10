import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useDashboardGestor } from "../../hooks/useDashboardGestor";
import DashboardCard from "../DashboardCard";
import RevenueChart from "./RevenueChart";

export default function DashboardGestor() {

  const {
    data,
    isLoading,
    error,
  } = useDashboardGestor();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#16A34A"
        />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text>
          Erro ao carregar dashboard.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: 20,
      }}
    >
      <Text style={styles.title}>
        {data.usina.nome}
      </Text>

      <Text style={styles.subtitle}>
        Competência {data.competencia}
      </Text>

     <View style={styles.row}>
  <DashboardCard
    icone="⚡"
    titulo="energiaGerada"
    valor={`${Number(data.energiaGerada).toFixed(0)} kWh`}
  />

  <DashboardCard
    icone="🔋"
    titulo="energiaDisponivel
"
    valor={`${Number(data.energiaDisponivel).toFixed(0)} kWh`}
  />
</View>

<View style={styles.row}>
  <DashboardCard
    icone="📈"
    titulo="ocupacao
"
    valor={`${Number(data.ocupacao).toFixed(1)}%`}
  />

  <DashboardCard
    icone="👥"
    titulo="Clientes"
    valor={data.clientes}
  />
</View>

<View style={styles.row}>
  <DashboardCard
    icone="💰"
    titulo="receitaPrevista
"
    valor={`R$ ${Number(data.receitaPrevista).toFixed(2)}`}
  />

  <DashboardCard
    icone="💵"
    titulo="receitaRealizada"
    valor={`R$ ${Number(data.receitaRealizada).toFixed(2)}`}
  />
</View>

      <RevenueChart
        previsto={data.receitaPrevista}
        recebido={data.receitaRealizada}
      />
    </ScrollView>
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
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    color: "#64748B",
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 15,
  },

});