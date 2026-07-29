import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DetalheItem from "../../components/DetalheItem";
import FaturaHeader from "../../components/FaturaHeader";
import { useFatura } from "../../hooks/useFatura";


export default function DetalheFatura() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  console.log("ID RECEBIDO:", id);

  const { data, isLoading } = useFatura(id);

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

  if (!data) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Fatura não encontrada.</Text>
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
      <FaturaHeader
  referencia={data.referencia}
  valor={Number(data.valor_final)}
/>

<Text
  style={{
    fontSize: 12,
    color: "red",
    marginBottom: 20,
  }}
>
  {data.arquivo_url || "SEM PDF"}
</Text>

<DetalheItem
  titulo="⚡ Consumo"
  valor={`${data.consumo_kwh} kWh`}
/>

      <DetalheItem
        titulo="⚡ Consumo"
        valor={`${data.consumo_kwh} kWh`}
      />

      <DetalheItem
        titulo="📅 Vencimento"
        valor={data.vencimento}
      />

      <DetalheItem
        titulo="👤 Cliente"
        valor={data.clientes.nome}
      />

      <DetalheItem
        titulo="🏠 Unidade Consumidora"
        valor={data.clientes.uc}
      />
    </ScrollView>
  </SafeAreaView>
);
}