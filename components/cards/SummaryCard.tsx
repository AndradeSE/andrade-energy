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
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>
            Economia do mês
          </Text>

          <Text style={styles.value}>
            R$ {Number(economia).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>

        <View style={styles.icon}>
          <Ionicons
            name="flash"
            size={34}
            color="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>
            Injetada
          </Text>

          <Text style={styles.metricValue}>
            {injecao.toFixed(0)} kWh
          </Text>
        </View>

        <View style={styles.metric}>
          <Text style={styles.metricLabel}>
            Compensada
          </Text>

          <Text style={styles.metricValue}>
            {compensacao.toFixed(0)} kWh
          </Text>
        </View>

        <View style={styles.metric}>
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
  card: {
    backgroundColor: "#16A34A",
    borderRadius: 26,
    padding: 22,
    marginBottom: 22,
    elevation: 6,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: "#DCFCE7",
    fontSize: 15,
  },

  value: {
    marginTop: 8,
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "700",
  },

  icon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,.18)",
    justifyContent: "center",
    alignItems: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,.18)",
    marginVertical: 22,
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
    fontSize: 12,
  },

  metricValue: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  button: {
    marginTop: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },

  buttonText: {
    marginLeft: 8,
    color: "#16A34A",
    fontWeight: "700",
    fontSize: 15,
  },
});