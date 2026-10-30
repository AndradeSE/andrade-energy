import { Text, View } from "react-native";

type Props = {
  referencia: string;
  valor: number;
};

export default function FaturaHeader({
  referencia,
  valor,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: "#16A34A",
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          color: "#DCFCE7",
          fontSize: 15,
        }}
      >
        Fatura
      </Text>

      <Text
        style={{
          color: "#FFF",
          fontSize: 28,
          fontWeight: "bold",
          marginTop: 8,
        }}
      >
        {referencia}
      </Text>

      <Text
        style={{
          color: "#FFF",
          fontSize: 36,
          fontWeight: "bold",
          marginTop: 20,
        }}
      >
        R$ {valor.toFixed(2).replace(".", ",")}
      </Text>

      <View
        style={{
          marginTop: 20,
          backgroundColor: "#DCFCE7",
          alignSelf: "flex-start",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
        }}
      >
        <Text
          style={{
            color: "#15803D",
            fontWeight: "bold",
          }}
        >
          ✓ Pago
        </Text>
      </View>
    </View>
  );
}