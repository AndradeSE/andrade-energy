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
        backgroundColor: "#FFF",
        borderRadius: 18,
        padding: 18,
        marginTop: 18,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#111827",
          marginBottom: 14,
        }}
      >
        {titulo}
      </Text>

      <View
        style={{
          height: 12,
          backgroundColor: "#E2E8F0",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.min(percentual, 100)}%`,
            height: "100%",
            backgroundColor: "#16A34A",
          }}
        />
      </View>

      <Text
        style={{
          marginTop: 10,
          color: "#16A34A",
          fontWeight: "700",
          fontSize: 16,
        }}
      >
        {percentual.toFixed(1)}%
      </Text>
    </View>
  );
}