import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { obterSessao } from "../services/session.service";

export default function Index() {
  const [destino, setDestino] = useState<string>();

  useEffect(() => {
    async function carregar() {
      const usuario = await obterSessao();

      if (usuario) {
        setDestino("/(tabs)");
      } else {
        setDestino("/login");
      }
    }

    carregar();
  }, []);

  if (!destino) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={destino as any} />;
}