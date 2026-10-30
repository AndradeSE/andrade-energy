import { Text, View } from "react-native";

type Props = {
  titulo: string;
  valor: string;
};

export default function ResumoCard({
  titulo,
  valor,
}: Props) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 18,
        elevation: 2,
      }}
    >
      <Text
        style={{
          color: "#64748B",
          fontSize: 14,
        }}
      >
        {titulo}
      </Text>

      <Text
        style={{
          marginTop: 10,
          fontSize: 26,
          fontWeight: "bold",
          color: "#0F172A",
        }}
      >
        {valor}
      </Text>
    </View>
  );
}