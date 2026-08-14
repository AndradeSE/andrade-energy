import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  economia: number;
  injecao: number;
  compensacao: number;
  saldo: number;
};

export default function SummaryCard({
  economia,
  injecao,
  compensacao,
  saldo,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <View>
          <Text style={styles.subtitle}>
            Economia deste mês
          </Text>

          <Text style={styles.value}>
            R$ {economia.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>

        <View style={styles.circle}>
          <Ionicons
            name="flash"
            size={32}
            color="#FFF"
          />
        </View>
      </View>

      <View style={styles.line} />

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Ionicons
            name="sunny"
            size={22}
            color="#DCFCE7"
          />

          <Text style={styles.metricLabel}>
            Injetada
          </Text>

          <Text style={styles.metricValue}>
            {injecao.toFixed(0)} kWh
          </Text>
        </View>

        <View style={styles.metric}>
          <Ionicons
            name="swap-horizontal"
            size={22}
            color="#DCFCE7"
          />

          <Text style={styles.metricLabel}>
            Compensada
          </Text>

          <Text style={styles.metricValue}>
            {compensacao.toFixed(0)} kWh
          </Text>
        </View>

        <View style={styles.metric}>
          <Ionicons
            name="battery-half"
            size={22}
            color="#DCFCE7"
          />

          <Text style={styles.metricLabel}>
            Saldo
          </Text>

          <Text style={styles.metricValue}>
            {saldo.toFixed(0)} kWh
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button}>
        <Ionicons
          name="document-text-outline"
          size={18}
          color="#16A34A"
        />

        <Text style={styles.buttonText}>
          Ver última fatura
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#16A34A",
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
    elevation: 6,
  },

  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  subtitle: {
    color: "#DCFCE7",
    fontSize: 15,
  },

  value: {
    marginTop: 8,
    color: "#FFF",
    fontSize: 34,
    fontWeight: "700",
  },

  circle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  line: {
    height: 1,
    backgroundColor: "rgba(255,255,255,.18)",
    marginVertical: 24,
  },

  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  metric: {
    alignItems: "center",
    flex: 1,
  },

  metricLabel: {
    color: "#DCFCE7",
    marginTop: 6,
    fontSize: 12,
  },

  metricValue: {
    color: "#FFF",
    marginTop: 4,
    fontWeight: "700",
    fontSize: 16,
  },

  button: {
    marginTop: 24,
    backgroundColor: "#FFF",
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
    marginLeft: 8,
    color: "#16A34A",
    fontWeight: "700",
    fontSize: 15,
  },
});