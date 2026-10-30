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
  referenceValue?: number;
  referenceLabel?: string;
}

export default function AndradeBarChart({
  title,
  subtitle,
  data,
  color = "#16A34A",
  height = 220,
  totalLabel = "Total",
  formatTotal = (value) => `R$ ${value.toFixed(2).replace(".", ",")}`,
  referenceValue,
  referenceLabel = "Produção média",
}: Props) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  // Mesma leitura cromática usada no portal web: cada competência recebe
  // uma cor própria, em vez de repetir apenas o verde institucional.
  const palette = ["#1687AB", "#D59B00", "#7661C2", "#E07723", "#B94B75", "#4169A8"];

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
        showReferenceLine1={Number.isFinite(referenceValue) && Number(referenceValue) > 0}
        referenceLine1Position={referenceValue}
        referenceLine1Config={{ color: "#2563EB", thickness: 2, type: "dashed", dashWidth: 6, dashGap: 4 }}
        referenceLinesOverChartContent
        maxValue={Number(referenceValue) > 0 ? Math.max(Number(referenceValue), ...data.map(item => item.value), 1) * 1.15 : undefined}
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
      {Number(referenceValue) > 0 ? <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}><View style={{ width: 24, borderTopWidth: 2, borderTopColor: "#2563EB", borderStyle: "dashed" }} /><Text style={{ color: "#334155", flex: 1 }}>{referenceLabel}: {formatTotal(Number(referenceValue))}</Text></View> : null}

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
