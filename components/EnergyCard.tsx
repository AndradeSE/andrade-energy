import { Text, View } from "react-native";

type Props = {
  titulo: string;
  valor: string;
};

export default function EnergyCard({
  titulo,
  valor,
}: Props) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFF",
        padding: 18,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <Text
        style={{
          color: "#64748B",
          marginBottom: 8,
        }}
      >
        {titulo}
      </Text>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: "#0F172A",
        }}
      >
        {valor}
      </Text>
    </View>
  );
}