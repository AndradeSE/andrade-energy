import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  ImageBackground,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listarUsinas } from "../../services/usinas.service";

export default function Usinas() {
  const [usinas, setUsinas] = useState<any[]>([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const dados = await listarUsinas();
    setUsinas(dados ?? []);
  }

  return (
    <ImageBackground
      source={require("../../assets/images/background.png")}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, padding: 20 }}>
        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            marginBottom: 20,
            color: "#111827",
          }}
        >
          Usinas
        </Text>

        <FlatList
          data={usinas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/usinas/[id]",
                  params: { id: item.id },
                })
              }
              style={{
                backgroundColor: "rgba(255,255,255,0.95)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 18,
                }}
              >
                {item.nome}
              </Text>

              <Text>{item.distribuidora}</Text>

              <Text>
                Potência: {item.potencia_kwp} kWp
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View
              style={{
                marginTop: 80,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                }}
              >
                Nenhuma usina cadastrada
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </ImageBackground>
  );
}