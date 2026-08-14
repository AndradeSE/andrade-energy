import {
    ActivityIndicator,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useContrato } from "../../hooks/useContrato";

export default function Contrato() {

  const {
    data,
    isLoading,
    error,
  } = useContrato();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#16A34A"
        />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>
          Contrato não encontrado.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <Text style={styles.title}>
          Contrato
        </Text>

        <View style={styles.card}>

          <Item
            titulo="Número"
            valor={data.numero}
          />

          <Item
            titulo="Status"
            valor={data.status}
          />

          <Item
            titulo="Desconto"
            valor={`${data.desconto}%`}
          />

          <Item
            titulo="Assinatura"
            valor={formatarData(
              data.data_assinatura
            )}
          />

          <Item
            titulo="Início"
            valor={formatarData(
              data.vigencia_inicio
            )}
          />

          <Item
            titulo="Fim"
            valor={formatarData(
              data.vigencia_fim
            )}
          />

        </View>

        {data.arquivo_pdf && (

          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              Linking.openURL(
                data.arquivo_pdf
              )
            }
          >

            <Text style={styles.buttonText}>
              Abrir Contrato (PDF)
            </Text>

          </TouchableOpacity>

        )}

      </ScrollView>

    </SafeAreaView>
  );
}

function Item({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <View style={styles.item}>

      <Text style={styles.label}>
        {titulo}
      </Text>

      <Text style={styles.value}>
        {valor || "-"}
      </Text>

    </View>
  );
}

function formatarData(
  data?: string
) {

  if (!data) return "-";

  return new Date(data)
    .toLocaleDateString("pt-BR");

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
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 24,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  item: {
    marginBottom: 20,
  },

  label: {
    color: "#64748B",
    fontSize: 14,
    marginBottom: 6,
  },

  value: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 18,
  },

  button: {
    marginTop: 24,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },

  error: {
    fontSize: 18,
    color: "#DC2626",
    fontWeight: "600",
  },

});