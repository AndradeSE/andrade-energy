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
  totalLabel?: string;
  formatTotal?: (value: number) => string;
}

export default function AndradeBarChart({
  title,
  subtitle,
  data,
  color = "#16A34A",
  height = 220,
  totalLabel = "Total",
  formatTotal = (value) => `R$ ${value.toFixed(2).replace(".", ",")}`,
}: Props) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  // Mesma leitura cromática usada no portal web: cada competência recebe
  // uma cor própria, em vez de repetir apenas o verde institucional.
  const palette = ["#10B968", "#FFD23F", "#24A7C5", "#72C95B", "#FF9F1C", "#6C63FF"];

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
        data={data.map((item, index) => ({
          value: item.value,
          label: item.label,
          frontColor: palette[index % palette.length],
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
        rulesColor="#DCE8E1"
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
          {totalLabel}
        </Text>

        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color,
          }}
        >
          {formatTotal(total)}
        </Text>
      </View>
    </View>
  );
}
