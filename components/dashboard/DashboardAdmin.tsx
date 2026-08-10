import { Text, View } from "react-native";

export default function DashboardAdmin() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "bold",
        }}
      >
        Dashboard Administrativo
      </Text>
    </View>
  );
}