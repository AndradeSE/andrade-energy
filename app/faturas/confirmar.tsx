import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
    Alert,
    ImageBackground,
    ScrollView,
    Text,
    TouchableOpacity
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import InfoCard from "../../components/InfoCard";
import ValidationAlert from "../../components/ValidationAlert";

import { salvarFatura } from "../../services/faturas.service";
import { validarFatura } from "../../services/validacao.service";

export default function ConfirmarImportacao() {
  const params = useLocalSearchParams();

  const importacao = useMemo(() => {
    if (!params.importacao) return null;

    return JSON.parse(params.importacao as string);
  }, []);

  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState<string[]>([]);

  if (!importacao) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Importação inválida.</Text>
      </SafeAreaView>
    );
  }

  async function confirmar() {
    try {
      setLoading(true);

      const resultado = await validarFatura(
        importacao.dados
      );

      if (!resultado.valido) {
        setErros(resultado.erros);
        return;
      }

      await salvarFatura(importacao);

      Alert.alert(
        "Sucesso",
        "Fatura importada com sucesso."
      );

      router.back();
    } catch (error) {
      console.error(error);

      Alert.alert(
        "Erro",
        "Não foi possível importar a fatura."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            padding: 20,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 26,
              fontWeight: "bold",
              marginBottom: 20,
            }}
          >
            Confirmar Importação
          </Text>

          <ValidationAlert erros={erros} />

          <InfoCard
            titulo="Cliente"
            valor={importacao.dados.cliente}
          />

          <InfoCard
            titulo="UC"
            valor={importacao.dados.uc}
          />

          <InfoCard
            titulo="Distribuidora"
            valor={importacao.dados.distribuidora}
          />

          <InfoCard
            titulo="Competência"
            valor={importacao.dados.referencia}
          />

          <InfoCard
            titulo="Vencimento"
            valor={importacao.dados.vencimento}
          />

          <InfoCard
            titulo="Consumo"
            valor={`${importacao.dados.consumo} kWh`}
          />

          <InfoCard
            titulo="Valor da Fatura"
            valor={`R$ ${Number(
              importacao.dados.valorTotal
            )
              .toFixed(2)
              .replace(".", ",")}`}
          />

          <InfoCard
            titulo="Economia"
            valor={`R$ ${Number(
              importacao.dados.economia
            )
              .toFixed(2)
              .replace(".", ",")}`}
          />

          <TouchableOpacity
            disabled={loading}
            onPress={confirmar}
            style={{
              backgroundColor: "#16A34A",
              padding: 16,
              borderRadius: 12,
              marginTop: 20,
            }}
          >
            <Text
              style={{
                color: "#FFF",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              {loading
                ? "IMPORTANDO..."
                : "CONFIRMAR IMPORTAÇÃO"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "#DC2626",
              padding: 16,
              borderRadius: 12,
              marginTop: 12,
            }}
          >
            <Text
              style={{
                color: "#FFF",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              CANCELAR
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}