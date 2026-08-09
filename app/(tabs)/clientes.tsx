import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { listarClientes } from "../../services/clientes.service";

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const dados = await listarClientes();
      setClientes(dados ?? []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }

  const lista = useMemo(() => {
    return clientes.filter((cliente) => {
      const texto = busca.toLowerCase();

      return (
        cliente.nome?.toLowerCase().includes(texto) ||
        cliente.uc?.toLowerCase().includes(texto)
      );
    });
  }, [clientes, busca]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/background.png")}
      style={styles.background}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Clientes</Text>

        <Text style={styles.subtitle}>
          {lista.length} cliente{lista.length !== 1 ? "s" : ""}
        </Text>

        <TextInput
          placeholder="Buscar por nome ou UC"
          placeholderTextColor="#94A3B8"
          value={busca}
          onChangeText={setBusca}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => router.push("/clientes/novo")}
        >
          <Text style={styles.buttonText}>
            + Novo Cliente
          </Text>
        </TouchableOpacity>

        <FlatList
          data={lista}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                Nenhum cliente encontrado
              </Text>

              <Text style={styles.emptySubtitle}>
                Cadastre um cliente ou altere sua busca.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/clientes/[id]",
                  params: {
                    id: item.id,
                  },
                })
              }
            >
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.nome}>
                    {item.nome}
                  </Text>

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          item.status === "ATIVO"
                            ? "#DCFCE7"
                            : "#FEE2E2",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            item.status === "ATIVO"
                              ? "#15803D"
                              : "#DC2626",
                        },
                      ]}
                    >
                      {item.status ?? "ATIVO"}
                    </Text>
                  </View>
                </View>

                <View style={styles.info}>
                  <Text style={styles.label}>
                    UC
                  </Text>

                  <Text style={styles.value}>
                    {item.uc || "-"}
                  </Text>
                </View>

                
                                    <View style={styles.info}>
                  <Text style={styles.label}>
                    Distribuidora
                  </Text>

                  <Text style={styles.value}>
                    {item.distribuidora || "-"}
                  </Text>
                </View>

                <View style={styles.info}>
                  <Text style={styles.label}>
                    Telefone
                  </Text>

                  <Text style={styles.value}>
                    {item.telefone || "-"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
  },

  subtitle: {
    color: "#64748B",
    marginTop: 4,
    marginBottom: 20,
    fontSize: 15,
  },

  input: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  button: {
    backgroundColor: "#16A34A",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  list: {
    paddingBottom: 30,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  nome: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginRight: 12,
  },

  badge: {
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },

  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
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

  empty: {
    marginTop: 40,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  emptySubtitle: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
  },
});