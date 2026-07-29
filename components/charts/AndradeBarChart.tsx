import { Text, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

export interface AndradeBarItem {
  label: string;
  value: number;
}

interface Props {
  title?: string;
  subtitle?: string;
  data: AndradeBarItem[];
  color?: string;
  height?: number;
}

export default function AndradeBarChart({
  title,
  subtitle,
  data,
  color = "#16A34A",
  height = 220,
}: Props) {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <View
      style={{
        backgroundColor: "#FFF",
        borderRadius: 18,
        padding: 18,
        marginVertical: 12,
      }}
    >
      {title && (
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#0F172A",
          }}
        >
          {title}
        </Text>
      )}

      {subtitle && (
        <Text
          style={{
            marginTop: 4,
            marginBottom: 18,
            color: "#64748B",
          }}
        >
          {subtitle}
        </Text>
      )}

      <BarChart
        data={data.map(item => ({
          value: item.value,
          label: item.label,
          frontColor: color,
        }))}
        height={height}
        barWidth={28}
        spacing={22}
        roundedTop
        noOfSections={4}
        yAxisThickness={1}
        xAxisThickness={1}
        yAxisColor="#CBD5E1"
        xAxisColor="#CBD5E1"
        rulesColor="#E5E7EB"
        isAnimated
        xAxisLabelTextStyle={{
          color: "#64748B",
          fontSize: 12,
        }}
        yAxisTextStyle={{
          color: "#64748B",
          fontSize: 12,
        }}
      />

      <View
        style={{
          marginTop: 16,
          borderTopWidth: 1,
          borderColor: "#E2E8F0",
          paddingTop: 12,
        }}
      >
        <Text
          style={{
            color: "#64748B",
          }}
        >
          Total
        </Text>

        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#16A34A",
          }}
        >
          R$ {total.toFixed(2).replace(".", ",")}
        </Text>
      </View>
    </View>
  );
}