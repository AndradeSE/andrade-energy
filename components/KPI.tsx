import { Text, View } from "react-native";

interface Props {
  titulo: string;
  valor: string;
  cor?: string;
}

export default function KPI({
  titulo,
  valor,
  cor = "#16A34A",
}: Props) {
  return (
    <View
      style={{
        flex: 1,
        margin: 6,
        padding: 16,
        borderRadius: 12,
        backgroundColor: "#0F172A",
      }}
    >
      <Text
        style={{
          color: "#94A3B8",
          fontSize: 13,
        }}
      >
        {titulo}
      </Text>

      <Text
        style={{
          color: cor,
          fontSize: 24,
          fontWeight: "bold",
          marginTop: 8,
        }}
      >
        {valor}
      </Text>
    </View>
  );
}