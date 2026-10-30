import { Text, View } from "react-native";

type Props = {
  titulo: string;
  valor: string;
};

export default function InfoCard({
  titulo,
  valor,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: "#FFF",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          color: "#64748B",
          fontSize: 13,
        }}
      >
        {titulo}
      </Text>

      <Text
        style={{
          fontSize: 18,
          fontWeight: "bold",
          color: "#0F172A",
        }}
      >
        {valor}
      </Text>
    </View>
  );
}