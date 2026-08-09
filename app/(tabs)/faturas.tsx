import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useFaturas } from "../../hooks/useFaturas";
export default function Faturas() {
const { data, isLoading, error } = useFaturas();
  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>
          Erro ao carregar as faturas.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Faturas</Text>

            <Text style={styles.subtitle}>
              {data?.length ?? 0} faturas encontradas
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              Nenhuma fatura encontrada
            </Text>

            <Text style={styles.emptySubtitle}>
              Importe uma fatura para começar.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: "/faturas/[id]",
                params: {
                  id: item.id,
                },
              })
            }
          >
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.competencia}>
                  {item.referencia}
                </Text>

                <View
                  style={[
                    styles.status,
                    {
                      backgroundColor:
                        item.status === "PAGA"
                          ? "#DCFCE7"
                          : "#FEF3C7",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          item.status === "PAGA"
                            ? "#15803D"
                            : "#B45309",
                      },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.valor}>
                R${" "}
                {Number(
                  item.valor_final ??
                    item.valor_total ??
                    0
                ).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </Text>

              <View style={styles.infoRow}>
                <Text style={styles.label}>
                  Consumo
                </Text>

                <Text style={styles.value}>
                  {item.consumo_kwh ?? item.consumo ?? 0} kWh
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>
                  Vencimento
                </Text>

                <Text style={styles.value}>
                  {item.vencimento}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
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

  list: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0F172A",
  },

  subtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  competencia: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  status: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  valor: {
    fontSize: 28,
    fontWeight: "700",
    color: "#16A34A",
    marginBottom: 18,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  label: {
    color: "#64748B",
    fontSize: 14,
  },

  value: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },

  error: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
  },

  empty: {
    marginTop: 80,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  emptySubtitle: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
  },
});