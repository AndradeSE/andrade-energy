import { Linking, Text, TouchableOpacity, View } from "react-native";

type Props = {
  cliente: string;
  telefone: string;
  valor: number;
  referencia: string;
};

export default function FinancialPendingCard({
  cliente,
  telefone,
  valor,
  referencia,
}: Props) {
  function cobrar() {
    const numero = telefone.replace(/\D/g, "");

    const mensagem = encodeURIComponent(
      `Olá ${cliente}! Identificamos uma pendência referente à competência ${referencia} no valor de R$ ${valor
        .toFixed(2)
        .replace(".", ",")}. Podemos ajudar?`
    );

    Linking.openURL(
      `https://wa.me/55${numero}?text=${mensagem}`
    );
  }

  return (
    <View
      style={{
        backgroundColor: "#FFF",
        padding: 18,
        borderRadius: 16,
        marginBottom: 14,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "bold",
        }}
      >
        {cliente}
      </Text>

      <Text>
        Competência: {referencia}
      </Text>

      <Text
        style={{
          color: "#DC2626",
          marginTop: 6,
          fontWeight: "bold",
        }}
      >
        R$ {valor.toFixed(2).replace(".", ",")}
      </Text>

      <TouchableOpacity
        onPress={cobrar}
        style={{
          backgroundColor: "#16A34A",
          padding: 12,
          borderRadius: 10,
          marginTop: 14,
        }}
      >
        <Text
          style={{
            color: "#FFF",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          COBRAR VIA WHATSAPP
        </Text>
      </TouchableOpacity>
    </View>
  );
}