import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Radius, Spacing, Typography } from "../../theme";

type EscolhaRepasse = "REPASSAR" | "ABSORVER";

type Props = {
  descontoPercentual: string | number;
  tipoGd?: string | null;
  modalidadeFaturamento?: string | null;
  consumoProjetado?: string | number | null;
  faturaSomenteAndrade?: boolean;
  dadosFatura?: Record<string, any> | null;
  projetarConsumoIntegral?: boolean;
  disponibilidadeGd1: EscolhaRepasse;
  disponibilidadeGd2: EscolhaRepasse;
  fioBGd2: EscolhaRepasse;
};

export default function RealDiscountInfo({
  descontoPercentual,
  tipoGd,
  modalidadeFaturamento,
  consumoProjetado,
  faturaSomenteAndrade = false,
  dadosFatura,
  projetarConsumoIntegral = false,
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
  const contaSemLeituraGd = Boolean(dadosFatura) && !possuiLeituraGd(dadosFatura);
  const consumoIntegral = projetarConsumoIntegral
    ? obterConsumoProjetado(dadosFatura) || Math.max(0, numeroBrasileiro(consumoProjetado))
    : 0;
  const projecaoPelaFaturaDoPerfil = contaSemLeituraGd && consumoIntegral > 0;
  // Sem uma leitura GD não há como conhecer a parcela compensada, o Fio B ou
  // a disponibilidade daquela competência. A tela mantém as escolhas visíveis,
  // mas não cria percentuais artificiais a partir de médias ou tarifas fixas.
  const contaSemGd = !dadosFatura || (contaSemLeituraGd && !projecaoPelaFaturaDoPerfil);
  if (modalidadeAindaNaoIdentificada) {
    if (disponibilidadeGd1 === "REPASSAR") configuracoesRepassadas.push("disponibilidade GD I");
    if (disponibilidadeGd2 === "REPASSAR") configuracoesRepassadas.push("disponibilidade GD II");
    if (fioBGd2 === "REPASSAR") configuracoesRepassadas.push("Fio B");
  }
  const previa = contaSemGd ? null : calcularPrevia({ dados: dadosFatura, desconto, modalidadeFaturamento, tipoGd: modalidade, disponibilidadeGd1, disponibilidadeGd2, fioBGd2, consumoIntegralProjetado: projecaoPelaFaturaDoPerfil ? consumoIntegral : 0 });
  const descontoRealEstimado = contaSemGd
    ? "0,00%"
    : previa
    ? formatarPercentual(previa.descontoReal)
    : "Dados da fatura incompletos";
  const estimativaDetalhe = modalidadeAindaNaoIdentificada
      ? "A modalidade GD será confirmada pela conta de energia. Ao importar a fatura, a projeção passa a considerar os custos e repasses escolhidos."
    : configuracoesRepassadas.length
      ? "Os custos repassados reduzem a economia percebida pelo cliente."
      : "A Andrade absorve os custos selecionados; outros encargos ainda podem variar."
  const detalheExibido = contaSemGd
    ? "Esta conta ainda não possui energia compensada GD I/GD II nem energia injetada. A projeção permanece zerada até chegar uma fatura com GD."
    : previa
    ? `${projecaoPelaFaturaDoPerfil ? `${formatarKwh(consumoIntegral)} compensados (100% do consumo). ` : ""}${formatarMoeda(previa.economia)} de economia sobre ${formatarMoeda(previa.baseDesconto)} de energia cheia. ${resumoDosRepasses(previa)}${faturaSomenteAndrade ? " A conta da concessionária permanece separada." : ""}${referenciaFatura(dadosFatura)}`
    : estimativaDetalhe;
  const impacto = contaSemGd
    ? "As configurações de faturamento GD serão liberadas automaticamente quando uma conta com leitura GD for vinculada à unidade."
    : modalidadeAindaNaoIdentificada
    ? "A modalidade GD será identificada pela fatura. Sem leitura GD, a projeção não usa estimativa."
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
          <Text style={styles.estimateLabel}>{contaSemGd ? "PROJEÇÃO AGUARDANDO GD" : projecaoPelaFaturaDoPerfil ? "PROJEÇÃO COM 100% DO CONSUMO" : previa ? "PROJEÇÃO PELA ÚLTIMA FATURA" : "DESCONTO REAL ESTIMADO"}</Text>
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
        <Text style={styles.formulaText}>Economia real ÷ valor total sem Andrade × 100</Text>
      </View>

      <Text style={styles.impact}>{impacto}</Text>
      <Text style={styles.footnote}>{previa
        ? faturaSomenteAndrade
          ? "A projeção soma o que continuará sendo pago à concessionária com a cobrança Andrade para medir a economia real, mesmo em documentos separados."
          : "O app mantém os valores da última fatura como base e recalcula somente o desconto e as escolhas de repasse ou absorção."
        : "Importe uma fatura com as linhas GD e as tarifas unitárias para calcular a porcentagem nesta tela."}</Text>
    </View>
  );
}

function formatarPercentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarKwh(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWh`;
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

function possuiLeituraGd(dados: Record<string, any> | null | undefined) {
  return n(
    dados,
    "energia_compensada",
    "energiaCompensada",
    "energia_compensada_gd1",
    "energiaCompensadaGD1",
    "energia_compensada_gd2",
    "energiaCompensadaGD2",
    "energia_injetada",
    "energiaInjetada",
  ) > 0;
}

function obterConsumoProjetado(dados: Record<string, any> | null | undefined) {
  return Math.max(0, n(
    dados,
    "consumo_kwh",
    "consumoKwh",
    "consumo_faturado",
    "consumoFaturado",
    "consumo",
  ));
}

function calcularPrevia({ dados, desconto, modalidadeFaturamento, tipoGd, disponibilidadeGd1, disponibilidadeGd2, fioBGd2, consumoIntegralProjetado = 0 }: {
  dados?: Record<string, any> | null; desconto: number; modalidadeFaturamento?: string | null; tipoGd: string;
  disponibilidadeGd1: EscolhaRepasse; disponibilidadeGd2: EscolhaRepasse; fioBGd2: EscolhaRepasse; consumoIntegralProjetado?: number;
}) {
  if (!dados) return null;
  let tarifaCheia = n(dados, "tarifa_cheia", "tarifaCheia");
  const valorCemig = n(dados, "valor_cemig", "valorCemig", "valor_concessionaria", "valorConcessionaria", "valor_total", "valorTotal");
  const valorEnergiaConcessionaria = n(dados, "valor_energia_concessionaria", "valorEnergiaConcessionaria") || valorCemig;
  const energiaGD1 = n(dados, "energia_compensada_gd1", "energiaCompensadaGD1");
  const energiaGD2 = n(dados, "energia_compensada_gd2", "energiaCompensadaGD2");
  const energiaCompensada = n(dados, "energia_compensada", "energiaCompensada") || energiaGD1 + energiaGD2;
  const energiaInjetada = n(dados, "energia_injetada", "energiaInjetada");
  const modalidade = String(modalidadeFaturamento ?? "COMPENSACAO").toUpperCase();
  const possuiCompensacaoLida = energiaCompensada > 0 || energiaGD1 > 0 || energiaGD2 > 0;
  const possuiLeituraGd = possuiCompensacaoLida || energiaInjetada > 0 || consumoIntegralProjetado > 0;
  // Numa conta GD, injeção usa a energia que veio da usina e compensação usa
  // exclusivamente Energia compensada GD I/GD II. O consumo é apenas a base
  // estimada de uma conta convencional, antes da primeira competência GD.
  const baseKwh = consumoIntegralProjetado > 0
      ? consumoIntegralProjetado
      : modalidade === "INJECAO"
      ? energiaInjetada
      : energiaCompensada;
  if (tarifaCheia <= 0) {
    const energiaCheia = n(dados, "valor_energia_cheia", "valorEnergiaCheia");
    const baseTarifa = baseKwh;
    tarifaCheia = baseTarifa > 0 ? energiaCheia / baseTarifa : 0;
  }
  if (tarifaCheia <= 0 || valorCemig <= 0 || baseKwh <= 0) return null;

  const franquiaDisponibilidade = n(dados, "franquia_disponibilidade_kwh", "franquiaDisponibilidadeKwh");
  const tarifaDisponibilidadeSemImpostos = n(dados, "tarifa_disponibilidade_sem_impostos", "tarifaDisponibilidadeSemImpostos");
  const custoDisponibilidadeGD1 = n(dados, "custo_disponibilidade_gd1", "custoDisponibilidadeGD1") ||
    franquiaDisponibilidade * tarifaDisponibilidadeSemImpostos;
  const custoDisponibilidadeGD2 = n(dados, "custo_disponibilidade_gd2", "custoDisponibilidadeGD2") ||
    n(dados, "custo_disponibilidade", "custoDisponibilidade") ||
    n(dados, "valor_absorvido_disponibilidade", "valorAbsorvidoDisponibilidade") +
      n(dados, "custo_disponibilidade_repassado", "custoDisponibilidadeRepassado") ||
    Math.max(0, franquiaDisponibilidade * (tarifaCheia - tarifaDisponibilidadeSemImpostos));
  // Faturas anteriores podem ter sido geradas quando apenas as parcelas
  // absorvida/repassada eram persistidas. Somá-las mantém o Fio B total
  // disponível para a simulação ao alternar a opção desta UC.
  const diferencaSalva = n(dados, "diferenca_fio_b", "diferencaFioB") ||
    n(dados, "valor_absorvido_fio_b", "valorAbsorvidoFioB") +
      n(dados, "diferenca_fio_b_repassada", "diferencaFioBRepassada");
  const tarifaScee = n(dados, "tarifa_scee", "tarifaScee");
  const tarifaGd2 = n(dados, "tarifa_gd", "tarifaGD2", "tarifaGD");
  const diferencaFioB = diferencaSalva > 0
    ? diferencaSalva
    : energiaGD2 > 0 && tarifaScee > tarifaGd2 && tarifaGd2 > 0
      ? energiaGD2 * (tarifaScee - tarifaGd2)
      : 0;
  const usaGD2 = tipoGd === "GD2" || tipoGd === "MISTA" || energiaGD2 > 0;
  const usaGD1 = tipoGd === "GD1" || tipoGd === "MISTA" || (!usaGD2 && energiaGD1 > 0);
  const custoDisponibilidade = usaGD2 ? custoDisponibilidadeGD2 : custoDisponibilidadeGD1;
  const absorveDisponibilidade = usaGD2 ? disponibilidadeGd2 === "ABSORVER" : usaGD1 && disponibilidadeGd1 === "ABSORVER";
  const valorAbsorvidoDisponibilidade = absorveDisponibilidade ? custoDisponibilidade : 0;
  const valorAbsorvidoFioB = usaGD2 && fioBGd2 === "ABSORVER" ? diferencaFioB : 0;
  if (!possuiLeituraGd) return null;
  const valorEnergiaCheia = Math.max(0, baseKwh * tarifaCheia);
  // A conta estimada sem usina usa somente a energia convencional pela tarifa
  // cheia da NF. Multa, iluminação, bandeira e demais encargos ficam fora da
  // referência; eles continuam no total real que o cliente precisa pagar.
  const referencia = valorEnergiaCheia;
  // A economia percebida é comparada com tudo que o cliente pagaria sem a
  // Andrade. Assim os encargos que continuam obrigatórios reduzem levemente o
  // percentual final mesmo quando disponibilidade e Fio B são absorvidos.
  if (referencia <= 0) return null;
  // Quando a Andrade absorve um custo GD, o abatimento aparece na própria
  // fatura Andrade. A conta CEMIG permanece com o valor original do PDF.
  const valorAndrade = Math.max(
    0,
    valorEnergiaCheia * (1 - desconto / 100) -
      valorAbsorvidoDisponibilidade - valorAbsorvidoFioB,
  );
  // Uma conta anexada ao perfil ainda pode ser convencional. Para simular
  // 100% de compensação, a parcela energética original deixa de existir e na
  // concessionária permanecem apenas os custos GD calculáveis com os dados
  // reais do PDF. Iluminação, bandeira e multas seguem fora desta comparação.
  const valorEnergiaConcessionariaProjetada = consumoIntegralProjetado > 0
    ? custoDisponibilidade + diferencaFioB
    : valorEnergiaConcessionaria;
  // Iluminação, multa, bandeira e demais encargos continuam no total da
  // competência, mas não compõem a comparação de economia da energia.
  const economia = Math.max(0, referencia - (valorEnergiaConcessionariaProjetada + valorAndrade));
  // A projeção apresentada ao cliente compara o desembolso total sem Andrade
  // com o total unificado. Os encargos obrigatórios seguem dentro dessa base;
  // por isso absorver Fio B e disponibilidade aproxima a economia do desconto
  // contratado, mas nunca deve ultrapassá-lo artificialmente.
  const baseDescontoReal = referencia;
  return {
    economia,
    baseDesconto: baseDescontoReal,
    descontoReal: economia / baseDescontoReal * 100,
    custoDisponibilidade,
    diferencaFioB,
    valorAbsorvidoDisponibilidade,
    valorAbsorvidoFioB,
    fioBEstimado: false,
    usaGD2,
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
      ? `${formatarMoeda(previa.valorAbsorvidoFioB)} de Fio B ${previa.fioBEstimado ? "estimado e " : ""}absorvido`
      : `${formatarMoeda(previa.diferencaFioB)} de Fio B ${previa.fioBEstimado ? "estimado e " : ""}repassado`);
  }
  if (!previa.usaGD2) partes.push("GD I sem defasagem de Fio B; crédito pela tarifa cheia");
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
