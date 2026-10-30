import { Text, View } from "react-native";

type Props = {
  erros: string[];
};

export default function ValidationAlert({
  erros,
}: Props) {

  if (!erros.length) return null;

  return (

    <View
      style={{
        backgroundColor: "#FEE2E2",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
      }}
    >

      <Text
        style={{
          fontWeight: "bold",
          color: "#991B1B",
          marginBottom: 8,
        }}
      >
        Corrija os problemas abaixo
      </Text>

      {erros.map((erro) => (

        <Text
          key={erro}
          style={{
            color: "#991B1B",
            marginBottom: 4,
          }}
        >
          • {erro}
        </Text>

      ))}

    </View>

  );

}