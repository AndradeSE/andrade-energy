import { Text, View } from "react-native";

type Props = {
  titulo: string;
  valor: string;
};

export default function StatCard({
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
      }}
    >
      <Text>{titulo}</Text>
      <Text>{valor}</Text>
    </View>
  );
}