import { Text } from "react-native";
import Card from "./Card";

type Props = {
  economia: number;
};

export default function EconomiaCard({
  economia,
}: Props) {
  return (
    <Card
      style={{
        backgroundColor: "#0F766E",
      }}
    >
      <Text
        style={{
          color: "#CCFBF1",
          fontSize: 16,
        }}
      >
        Economia do mês
      </Text>

      <Text
        style={{
          marginTop: 10,
          color: "#FFFFFF",
          fontSize: 36,
          fontWeight: "bold",
        }}
      >
        R$ {economia.toFixed(2).replace(".", ",")}
      </Text>
    </Card>
  );
}