import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Radius, Shadows, Spacing, Typography } from "../../theme";

type Props = { previsto: number; recebido: number };

function formatarMoeda(valor: number) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function RevenueChart({ previsto, recebido }: Props) {
  const previstoSeguro = Math.max(0, Number(previsto) || 0);
  const recebidoSeguro = Math.max(0, Number(recebido) || 0);
  const percentual = previstoSeguro > 0 ? Math.min(100, recebidoSeguro / previstoSeguro * 100) : 0;
  const pendente = Math.max(0, previstoSeguro - recebidoSeguro);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>RECEITA DA COMPETÊNCIA</Text>
          <Text style={styles.title}>Evolução dos recebimentos</Text>
        </View>
        <View style={styles.icon}><Ionicons name="stats-chart" size={21} color="#F6CC32" /></View>
      </View>
      <View style={styles.heroRow}>
        <View>
          <Text style={styles.heroLabel}>Recebido até agora</Text>
          <Text style={styles.heroValue}>{formatarMoeda(recebidoSeguro)}</Text>
        </View>
        <View style={styles.percentBadge}><Text style={styles.percentText}>{percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</Text></View>
      </View>
      <View style={styles.track}>
        <View style={[styles.progress, { width: `${percentual}%` }]} />
        {percentual > 0 ? <View style={[styles.glow, { left: `${Math.max(0, percentual - 1)}%` }]} /> : null}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, styles.receivedDot]} /><View><Text style={styles.legendLabel}>Realizado</Text><Text style={styles.legendValue}>{formatarMoeda(recebidoSeguro)}</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.legendItem}><View style={[styles.dot, styles.pendingDot]} /><View><Text style={styles.legendLabel}>A receber</Text><Text style={styles.legendValue}>{formatarMoeda(pendente)}</Text></View></View>
      </View>
      <View style={styles.goal}><Ionicons name="flag-outline" size={15} color="#B9D8CC" /><Text style={styles.goalText}>Previsão do mês: <Text style={styles.goalStrong}>{formatarMoeda(previstoSeguro)}</Text></Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.xl, overflow: "hidden", padding: Spacing.lg, borderRadius: Radius.xl, backgroundColor: "#063E31", ...Shadows.card },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: "#86EFAC", fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 4, color: "#FFFFFF", fontSize: Typography.card, fontWeight: "900" },
  icon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: Radius.round, backgroundColor: "rgba(255,255,255,.11)" },
  heroRow: { marginTop: Spacing.xl, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  heroLabel: { color: "#B9D8CC", fontSize: Typography.small },
  heroValue: { marginTop: 4, color: "#FFFFFF", fontSize: 27, fontWeight: "900" },
  percentBadge: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: Radius.round, backgroundColor: "#F6CC32" },
  percentText: { color: "#153B2F", fontSize: Typography.small, fontWeight: "900" },
  track: { position: "relative", height: 12, marginTop: Spacing.lg, overflow: "hidden", borderRadius: Radius.round, backgroundColor: "rgba(255,255,255,.14)" },
  progress: { height: "100%", minWidth: 3, borderRadius: Radius.round, backgroundColor: "#22C875" },
  glow: { position: "absolute", top: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: "#F6CC32" },
  legend: { flexDirection: "row", marginTop: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255,255,255,.12)" },
  legendItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  divider: { width: 1, marginHorizontal: Spacing.sm, backgroundColor: "rgba(255,255,255,.12)" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  receivedDot: { backgroundColor: "#22C875" },
  pendingDot: { backgroundColor: "#F6CC32" },
  legendLabel: { color: "#A7CABE", fontSize: 10 },
  legendValue: { marginTop: 2, color: "#FFFFFF", fontSize: Typography.caption, fontWeight: "800" },
  goal: { marginTop: Spacing.md, flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  goalText: { color: "#B9D8CC", fontSize: Typography.small },
  goalStrong: { color: "#FFFFFF", fontWeight: "800" },
});
