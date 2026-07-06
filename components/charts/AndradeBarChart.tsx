import { View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

export interface AndradeBarItem {
  label: string;
  value: number;
}

interface Props {
  data: AndradeBarItem[];
  color?: string;
  height?: number;
}

export default function AndradeBarChart({
  data,
  color = "#16A34A",
  height = 220,
}: Props) {
  return (
    <View style={{ marginVertical: 10 }}>
      <BarChart
        data={data.map(item => ({
          value: item.value,
          label: item.label,
          frontColor: color,
        }))}
        height={height}
        barWidth={26}
        spacing={18}
        roundedTop
        noOfSections={4}
        yAxisThickness={1}
        xAxisThickness={1}
        yAxisColor="#CBD5E1"
        xAxisColor="#CBD5E1"
        rulesColor="#E5E7EB"
        xAxisLabelTextStyle={{
          color: "#64748B",
        }}
        yAxisTextStyle={{
          color: "#64748B",
        }}
        isAnimated
      />
    </View>
  );
}