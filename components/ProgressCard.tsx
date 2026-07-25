import { Text, View } from "react-native";

type Props = {
  titulo: string;
  percentual: number;
};

export default function ProgressCard({
  titulo,
  percentual,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 18,
        marginTop: 18,
      }}
    >
      <Text
        style={{
          fontWeight: "bold",
          fontSize: 16,
          marginBottom: 12,
        }}
      >
        {titulo}
      </Text>

      <View
        style={{
          height: 12,
          backgroundColor: "#e2e8f0",
          borderRadius: 8,
        }}
      >
        <View
          style={{
            width: `${Math.min(percentual, 100)}%`,
            height: 12,
            backgroundColor: "#16A34A",
            borderRadius: 8,
          }}
        />
      </View>

      <Text
        style={{
          marginTop: 10,
          fontWeight: "bold",
        }}
      >
        {percentual.toFixed(1)}%
      </Text>
    </View>
  );
}