import { Text, TouchableOpacity, View } from "react-native";
import { formatarDataBrasileira } from "../services/faturas.service";

type Props = {
  competencia?: string;
  valor?: number;
  vencimento?: string;
  onPress?: () => void;
};

export default function UltimaFaturaCard({
  competencia,
  valor,
  vencimento,
  onPress,
}: Props) {
  const possuiFatura =
    competencia &&
    valor !== undefined &&
    vencimento;

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
          color: "#64748B",
        }}
      >
        Última fatura
      </Text>

      {possuiFatura ? (
        <>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              marginTop: 8,
            }}
          >
            {competencia}
          </Text>

          <Text
            style={{
              marginTop: 6,
            }}
          >
            R$ {valor.toFixed(2).replace(".", ",")}
          </Text>

          <Text
            style={{
              color: "#64748B",
              marginTop: 6,
            }}
          >
            Vencimento: {formatarDataBrasileira(vencimento)}
          </Text>

          <TouchableOpacity
            onPress={onPress}
            style={{
              marginTop: 18,
              backgroundColor: "#16A34A",
              padding: 14,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "#FFF",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              Ver Fatura
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text
          style={{
            marginTop: 12,
            color: "#64748B",
          }}
        >
          Nenhuma fatura encontrada.
        </Text>
      )}
    </View>
  );
}
