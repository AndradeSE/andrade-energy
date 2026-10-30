import { ReactNode } from "react";
import { Text, View } from "react-native";

type Props = {
  titulo: string;
  icone: string;
  children: ReactNode;
};

export default function DashboardSection({
  titulo,
  icone,
  children,
}: Props) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 20,
        marginTop: 20,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#0F172A",
          marginBottom: 16,
        }}
      >
        {icone} {titulo}
      </Text>

      {children}
    </View>
  );
}