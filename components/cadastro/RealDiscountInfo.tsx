import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";

type EscolhaRepasse = "REPASSAR" | "ABSORVER";

type Props = {
  descontoPercentual: string | number;
  tipoGd?: string | null;
  disponibilidadeGd1: EscolhaRepasse;
  disponibilidadeGd2: EscolhaRepasse;
  fioBGd2: EscolhaRepasse;
};

export default function RealDiscountInfo({
  descontoPercentual,
  tipoGd,
  disponibilidadeGd1,
  disponibilidadeGd2,
  fioBGd2,
}: Props) {
  const descontoInformado = Number(String(descontoPercentual ?? "").replace(",", "."));
  const desconto = Number.isFinite(descontoInformado)
    ? Math.max(0, Math.min(100, descontoInformado))
    : 0;
  const percentualTarifaAndrade = 100 - desconto;
  const modalidade = String(tipoGd ?? "").toUpperCase();
  const configuracoesRepassadas: string[] = [];

  if ((modalidade === "GD1" || modalidade === "MISTA") && disponibilidadeGd1 === "REPASSAR") {
    configuracoesRepassadas.push("disponibilidade GD I");
  }
  if ((modalidade === "GD2" || modalidade === "MISTA") && disponibilidadeGd2 === "REPASSAR") {
    configuracoesRepassadas.push("disponibilidade GD II");
  }
  if ((modalidade === "GD2" || modalidade === "MISTA") && fioBGd2 === "REPASSAR") {
    configuracoesRepassadas.push("Fio B");
  }

  const modalidadeAindaNaoIdentificada = !["GD1", "GD2", "MISTA"].includes(modalidade);
  const impacto = modalidadeAindaNaoIdentificada
    ? `Com ${formatarPercentual(desconto)} de desconto contratado, a tarifa Andrade será ${formatarPercentual(percentualTarifaAndrade)} da tarifa cheia. Na primeira conta, o sistema identificará GD I ou GD II e aplicará as escolhas correspondentes.`
    : configuracoesRepassadas.length
      ? `O desconto parte de ${formatarPercentual(desconto)}, mas ${configuracoesRepassadas.join(" e ")} permanecem com o cliente. Essas parcelas reduzem o desconto real da competência.`
      : `A usina assume disponibilidade e Fio B aplicáveis. Assim, o desconto real tende a se aproximar dos ${formatarPercentual(desconto)} contratados, embora outros encargos da concessionária possam permanecer.`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="calculator-outline" size={20} color={Colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Como calculamos o desconto real</Text>
          <Text style={styles.subtitle}>O percentual contratado é aplicado à energia; o real considera tudo que o cliente efetivamente paga.</Text>
        </View>
      </View>

      <View style={styles.formula}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.formulaLabel}>DESCONTO CONTRATADO</Text>
            <Text style={styles.summaryValue}>{formatarPercentual(desconto)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.formulaLabel}>TARIFA ANDRADE</Text>
            <Text style={styles.summaryValue}>{formatarPercentual(percentualTarifaAndrade)} da tarifa cheia</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <Text style={styles.formulaLabel}>ECONOMIA REAL</Text>
        <Text style={styles.formulaText}>Valor sem Andrade − total unificado</Text>
        <View style={styles.divider} />
        <Text style={styles.formulaLabel}>DESCONTO REAL</Text>
        <Text style={styles.formulaText}>Economia real ÷ valor da energia cheia × 100</Text>
      </View>

      <Text style={styles.impact}>{impacto}</Text>
      <Text style={styles.footnote}>O percentual exato só será conhecido após a leitura da fatura de cada competência.</Text>
    </View>
  );
}

function formatarPercentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderColor: "#CDE7D8", borderRadius: Radius.md, backgroundColor: "#F3FAF6" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  icon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: Colors.primaryLight },
  headerCopy: { flex: 1 },
  title: { color: Colors.primaryDark, fontSize: Typography.caption, fontWeight: "900" },
  subtitle: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 },
  formula: { marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.surface },
  summaryRow: { flexDirection: "row", alignItems: "stretch", gap: Spacing.sm },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  summaryValue: { marginTop: 4, color: Colors.primaryDark, fontSize: Typography.caption, fontWeight: "900", lineHeight: 18 },
  formulaLabel: { color: Colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  formulaText: { marginTop: 3, color: Colors.text, fontSize: Typography.small, fontWeight: "700", lineHeight: 18 },
  divider: { height: 1, marginVertical: Spacing.xs, backgroundColor: Colors.border },
  impact: { marginTop: Spacing.sm, color: Colors.text, fontSize: Typography.small, lineHeight: 19 },
  footnote: { marginTop: Spacing.xs, color: Colors.subtitle, fontSize: 10, fontStyle: "italic", lineHeight: 15 },
});
