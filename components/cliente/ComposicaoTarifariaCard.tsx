import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { Colors, Radius, Spacing, Typography } from "../../theme";

export type ComponenteTarifario = {
  id: string;
  label: string;
  valor: number;
  cor: string;
  detalhe?: string;
};

const moeda = (valor: number) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ComposicaoTarifariaCard({ itens = [] }: { itens?: ComponenteTarifario[] }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const validos = useMemo(() => itens.filter((item) => Number(item.valor) > 0), [itens]);
  const total = validos.reduce((soma, item) => soma + Number(item.valor), 0);
  const raio = 72;
  const circunferencia = 2 * Math.PI * raio;
  let acumulado = 0;

  if (total <= 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.eyebrow}>ÚLTIMA COMPETÊNCIA</Text>
          <Text style={styles.title}>Composição da fatura</Text>
        </View>
        <View style={styles.totalPill}><Text style={styles.totalText}>{moeda(total)}</Text></View>
      </View>

      <View style={styles.chartWrap}>
        <Svg width={190} height={190} viewBox="0 0 190 190">
          <G rotation="-90" origin="95, 95">
            <Circle cx="95" cy="95" r={raio} fill="none" stroke="#E7ECE9" strokeWidth="30" />
            {validos.map((item) => {
              const fracao = Number(item.valor) / total;
              const comprimento = Math.max(0, fracao * circunferencia - 4);
              const deslocamento = -acumulado * circunferencia;
              acumulado += fracao;
              return <Circle key={item.id} cx="95" cy="95" r={raio} fill="none" stroke={item.cor} strokeWidth="30" strokeDasharray={`${comprimento} ${circunferencia}`} strokeDashoffset={deslocamento} strokeLinecap="butt" />;
            })}
          </G>
        </Svg>
        <View pointerEvents="none" style={styles.center}>
          <Text style={styles.centerLabel}>TOTAL</Text>
          <Text style={styles.centerValue}>{moeda(total)}</Text>
        </View>
      </View>

      <Text style={styles.hint}>Toque em um item para entender o valor.</Text>
      {validos.map((item) => {
        const percentual = total > 0 ? (Number(item.valor) / total) * 100 : 0;
        const expandido = aberto === item.id;
        return (
          <TouchableOpacity key={item.id} activeOpacity={0.76} onPress={() => setAberto(expandido ? null : item.id)} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: item.cor }]} />
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowValue}>{moeda(item.valor)} · {percentual.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</Text>
              {expandido && item.detalhe ? <Text style={styles.detail}>{item.detalhe}</Text> : null}
            </View>
            <Ionicons name={expandido ? "chevron-up" : "chevron-down"} size={20} color={Colors.subtitle} />
          </TouchableOpacity>
        );
      })}
      <Text style={styles.note}>A composição usa somente valores identificados e efetivamente aplicados nesta fatura.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.xl, padding: Spacing.lg, borderRadius: Radius.xl, backgroundColor: "#F1F3F2" },
  heading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.sm },
  eyebrow: { color: Colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 4, color: Colors.text, fontSize: Typography.card, fontWeight: "800" },
  totalPill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.round, backgroundColor: "#DDE9E3" },
  totalText: { color: Colors.primaryDark, fontSize: Typography.small, fontWeight: "900" },
  chartWrap: { width: 190, height: 190, alignSelf: "center", marginVertical: Spacing.md, alignItems: "center", justifyContent: "center" },
  center: { position: "absolute", alignItems: "center" },
  centerLabel: { color: Colors.subtitle, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  centerValue: { marginTop: 3, color: Colors.text, fontSize: 17, fontWeight: "900" },
  hint: { marginBottom: Spacing.xs, color: Colors.subtitle, fontSize: Typography.small, textAlign: "center" },
  row: { minHeight: 66, flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#CBD5D0" },
  dot: { width: 12, height: 12, marginRight: Spacing.sm, borderRadius: 3 },
  rowCopy: { flex: 1, paddingVertical: Spacing.sm },
  rowLabel: { color: Colors.text, fontSize: Typography.caption, fontWeight: "700" },
  rowValue: { marginTop: 3, color: Colors.primaryDark, fontSize: Typography.caption, fontWeight: "900" },
  detail: { marginTop: 6, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 17 },
  note: { marginTop: Spacing.sm, color: Colors.subtitle, fontSize: 10, lineHeight: 15 },
});
