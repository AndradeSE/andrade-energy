import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";

type EscolhaRepasse = "REPASSAR" | "ABSORVER";

type Props = {
  descontoPercentual: string | number;
  tipoGd?: string | null;
  modalidadeFaturamento?: string | null;
  dadosFatura?: Record<string, any> | null;
  disponibilidadeGd1: EscolhaRepasse;
  disponibilidadeGd2: EscolhaRepasse;
  fioBGd2: EscolhaRepasse;
};

export default function RealDiscountInfo({
  descontoPercentual,
  tipoGd,
  modalidadeFaturamento,
  dadosFatura,
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
  if (modalidadeAindaNaoIdentificada) {
    if (disponibilidadeGd1 === "REPASSAR") configuracoesRepassadas.push("disponibilidade GD I");
    if (disponibilidadeGd2 === "REPASSAR") configuracoesRepassadas.push("disponibilidade GD II");
    if (fioBGd2 === "REPASSAR") configuracoesRepassadas.push("Fio B");
  }
  const previa = calcularPrevia({ dados: dadosFatura, desconto, modalidadeFaturamento, tipoGd: modalidade, disponibilidadeGd1, disponibilidadeGd2, fioBGd2 });
  const descontoRealEstimado = previa
    ? formatarPercentual(previa.descontoReal)
    : `Aproximadamente ${formatarPercentual(desconto)}`;
  const estimativaDetalhe = modalidadeAindaNaoIdentificada
      ? "A modalidade GD será confirmada pela conta de energia. Ao importar a fatura, a projeção passa a considerar os custos e repasses escolhidos."
    : configuracoesRepassadas.length
      ? "Os custos repassados reduzem a economia percebida pelo cliente."
      : "A Andrade absorve os custos selecionados; outros encargos ainda podem variar."
  const detalheExibido = previa
    ? `${formatarMoeda(previa.economia)} de economia sobre ${formatarMoeda(previa.baseDesconto)} de energia cheia. ${resumoDosRepasses(previa)}${referenciaFatura(dadosFatura)}`
    : estimativaDetalhe;
  const impacto = modalidadeAindaNaoIdentificada
    ? `Com ${formatarPercentual(desconto)} de desconto contratado, a tarifa Andrade será ${formatarPercentual(percentualTarifaAndrade)} da tarifa cheia. Na primeira conta, o sistema identificará GD I ou GD II e aplicará as escolhas atuais de repasse ou absorção.`
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
        <View style={styles.estimateBox}>
          <Text style={styles.estimateLabel}>{previa ? "PROJEÇÃO PELA ÚLTIMA FATURA" : "DESCONTO REAL ESTIMADO"}</Text>
          <Text style={styles.estimateValue}>{descontoRealEstimado}</Text>
          <Text style={styles.estimateDetail}>{detalheExibido}</Text>
        </View>
        <View style={styles.divider} />
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
      <Text style={styles.footnote}>{previa
        ? "O app mantém os valores da última fatura como base e recalcula somente o desconto e as escolhas de repasse ou absorção."
        : "Importe uma fatura ou vincule uma UC que já possua histórico para calcular a porcentagem nesta tela."}</Text>
    </View>
  );
}

function formatarPercentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function referenciaFatura(dados: Record<string, any> | null | undefined) {
  const valor = String(dados?.referencia ?? "").trim();
  if (!valor) return "";
  const correspondencia = /^(\d{4})-(\d{2})/.exec(valor);
  return ` Base: ${correspondencia ? `${correspondencia[2]}/${correspondencia[1]}` : valor}.`;
}

function numeroBrasileiro(valor: unknown) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const texto = String(valor ?? "").trim();
  if (!texto) return 0;
  const apenasNumero = texto.replace(/[^\d,.-]/g, "");
  const normalizado = apenasNumero.includes(",")
    ? apenasNumero.replace(/\./g, "").replace(",", ".")
    : apenasNumero.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

function n(dados: Record<string, any> | null | undefined, ...chaves: string[]) {
  let encontrado = 0;
  for (const chave of chaves) {
    const original = dados?.[chave];
    if (original === undefined || original === null || String(original).trim() === "") continue;
    const valor = numeroBrasileiro(original);
    if (Number.isFinite(valor)) {
      encontrado = valor;
      if (valor !== 0) return valor;
    }
  }
  return encontrado;
}

function calcularPrevia({ dados, desconto, modalidadeFaturamento, tipoGd, disponibilidadeGd1, disponibilidadeGd2, fioBGd2 }: {
  dados?: Record<string, any> | null; desconto: number; modalidadeFaturamento?: string | null; tipoGd: string;
  disponibilidadeGd1: EscolhaRepasse; disponibilidadeGd2: EscolhaRepasse; fioBGd2: EscolhaRepasse;
}) {
  if (!dados) return null;
  let tarifaCheia = n(dados, "tarifa_cheia", "tarifaCheia");
  const valorCemig = n(dados, "valor_cemig", "valorCemig", "valor_concessionaria", "valorConcessionaria", "valorTotal");
  const consumo = n(dados, "consumo_kwh", "consumo");
  const energiaGD1 = n(dados, "energia_compensada_gd1", "energiaCompensadaGD1");
  const energiaGD2 = n(dados, "energia_compensada_gd2", "energiaCompensadaGD2");
  const energiaCompensada = n(dados, "energia_compensada", "energiaCompensada") || energiaGD1 + energiaGD2;
  const energiaInjetada = n(dados, "energia_injetada", "energiaInjetada");
  const baseKwh = String(modalidadeFaturamento ?? "COMPENSACAO").toUpperCase() === "INJECAO" ? energiaInjetada : energiaCompensada;
  if (tarifaCheia <= 0) {
    const energiaCheia = n(dados, "valor_energia_cheia", "valorEnergiaCheia");
    const baseTarifa = baseKwh || consumo;
    tarifaCheia = baseTarifa > 0 ? energiaCheia / baseTarifa : 0;
  }
  if (tarifaCheia <= 0 || valorCemig <= 0 || baseKwh <= 0) return null;

  const custoDisponibilidade = n(dados, "custo_disponibilidade", "custoDisponibilidade", "custo_disponibilidade_repassado", "custoDisponibilidadeRepassado");
  const diferencaSalva = n(dados, "diferenca_fio_b", "diferencaFioB");
  const tarifaScee = n(dados, "tarifa_scee", "tarifaScee");
  const tarifaGd2 = n(dados, "tarifa_gd", "tarifaGD2", "tarifaGD");
  const diferencaFioB = diferencaSalva > 0 ? diferencaSalva : energiaGD2 > 0 && tarifaScee > tarifaGd2 && tarifaGd2 > 0 ? energiaGD2 * (tarifaScee - tarifaGd2) : 0;
  const usaGD2 = tipoGd === "GD2" || tipoGd === "MISTA" || energiaGD2 > 0;
  const usaGD1 = tipoGd === "GD1" || tipoGd === "MISTA" || (!usaGD2 && energiaGD1 > 0);
  const absorveDisponibilidade = usaGD2 ? disponibilidadeGd2 === "ABSORVER" : usaGD1 && disponibilidadeGd1 === "ABSORVER";
  const valorAbsorvidoDisponibilidade = absorveDisponibilidade ? custoDisponibilidade : 0;
  const valorAbsorvidoFioB = usaGD2 && fioBGd2 === "ABSORVER" ? diferencaFioB : 0;
  const absorvido = Math.min(valorCemig, valorAbsorvidoDisponibilidade + valorAbsorvidoFioB);

  const valorEnergiaSemGd = Math.max(0, consumo * tarifaCheia);
  const creditoGD1 = energiaGD1 * tarifaCheia;
  const limiteCreditoGD2 = Math.max(0, valorEnergiaSemGd - n(dados, "valor_energia_concessionaria", "valorEnergiaConcessionaria") - creditoGD1);
  const creditoGD2 = energiaGD2 > 0 ? Math.min(energiaGD2 * tarifaCheia, limiteCreditoGD2) : 0;
  const creditoEfetivo = energiaGD1 + energiaGD2 > 0
    ? creditoGD1 + creditoGD2
    : Math.min(energiaCompensada * tarifaCheia, Math.max(0, valorEnergiaSemGd - n(dados, "valor_energia_concessionaria", "valorEnergiaConcessionaria")));
  const referencia = n(dados, "valor_referencia_sem_andrade", "valorReferenciaSemAndrade") || valorCemig + creditoEfetivo;
  const baseDesconto = usaGD2 ? valorEnergiaSemGd : creditoEfetivo;
  if (baseDesconto <= 0) return null;
  const valorAndrade = baseKwh * tarifaCheia * (1 - desconto / 100);
  const valorCemigRepassado = Math.max(0, valorCemig - absorvido);
  const economia = Math.max(0, referencia - (valorCemigRepassado + valorAndrade));
  return {
    economia,
    baseDesconto,
    descontoReal: economia / baseDesconto * 100,
    custoDisponibilidade,
    diferencaFioB,
    valorAbsorvidoDisponibilidade,
    valorAbsorvidoFioB,
  };
}

function resumoDosRepasses(previa: ReturnType<typeof calcularPrevia>) {
  if (!previa) return "";
  const partes: string[] = [];
  if (previa.custoDisponibilidade > 0) {
    partes.push(previa.valorAbsorvidoDisponibilidade > 0
      ? `${formatarMoeda(previa.valorAbsorvidoDisponibilidade)} de disponibilidade absorvida`
      : `${formatarMoeda(previa.custoDisponibilidade)} de disponibilidade repassada`);
  }
  if (previa.diferencaFioB > 0) {
    partes.push(previa.valorAbsorvidoFioB > 0
      ? `${formatarMoeda(previa.valorAbsorvidoFioB)} de Fio B absorvido`
      : `${formatarMoeda(previa.diferencaFioB)} de Fio B repassado`);
  }
  return partes.length ? ` ${partes.join(" e ")}.` : "";
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md, padding: Spacing.md, borderWidth: 1, borderColor: "#CDE7D8", borderRadius: Radius.md, backgroundColor: "#F3FAF6" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  icon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: Colors.primaryLight },
  headerCopy: { flex: 1 },
  title: { color: Colors.primaryDark, fontSize: Typography.caption, fontWeight: "900" },
  subtitle: { marginTop: 3, color: Colors.subtitle, fontSize: Typography.small, lineHeight: 18 },
  formula: { marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.surface },
  estimateBox: { paddingVertical: 2 },
  estimateLabel: { color: Colors.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  estimateValue: { marginTop: 4, color: Colors.primaryDark, fontSize: 22, fontWeight: "900", lineHeight: 27 },
  estimateDetail: { marginTop: 3, color: Colors.subtitle, fontSize: 10, lineHeight: 15 },
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
