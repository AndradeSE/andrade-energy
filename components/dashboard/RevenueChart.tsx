import { View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

type Props = {
  previsto: number;
  recebido: number;
};

export default function RevenueChart({
  previsto,
  recebido,
}: Props) {
  return (
    <View style={{ paddingVertical: 10 }}>
      <LineChart
        areaChart
        curved
        color="#16A34A"
        startFillColor="#16A34A"
        endFillColor="#16A34A"
        startOpacity={0.35}
        endOpacity={0.05}
        data={[
          {
            value: previsto,
            label: "Prev.",
          },
          {
            value: recebido,
            label: "Receb.",
          },
        ]}
        thickness={3}
        hideDataPoints={false}
        dataPointsColor="#16A34A"
        yAxisColor="#CBD5E1"
        xAxisColor="#CBD5E1"
        rulesColor="#E2E8F0"
      />
    </View>
  );
}