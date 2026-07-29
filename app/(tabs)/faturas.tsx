import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFaturas } from "../../hooks/useFaturas";



export default function Faturas() {
  const { data, isLoading, error } =
  useFaturas("16b9bf33-eb44-4585-b941-99ae0210c277");


    
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

  if (error) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text>Erro ao carregar as faturas.</Text>
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
      <FlatList
        data={data ?? []}
        contentContainerStyle={{
          padding: 20,
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
  onPress={() =>
    router.push({
      pathname: "/faturas/[id]",
      params: {
        id: item.id,
      },
    })
  }
>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                }}
              >
                {item.referencia}
              </Text>

              <Text
                style={{
                  marginTop: 8,
                  fontSize: 18,
                }}
              >
                R$ {Number(item.valor_final).toFixed(2)}
              </Text>

              <Text
                style={{
                  color: "#64748B",
                  marginTop: 6,
                }}
              >
                {item.vencimento}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}