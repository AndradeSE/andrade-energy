import { Text, View } from "react-native";

type Props = {
  titulo: string;
  valor: string;
};

export default function DetalheItem({
  titulo,
  valor,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 18,
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
          marginTop: 6,
          fontSize: 18,
          fontWeight: "600",
          color: "#0F172A",
        }}
      >
        {valor}
      </Text>
    </View>
  );
}