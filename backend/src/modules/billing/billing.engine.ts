export type ModalidadeFaturamento = "INJECAO" | "COMPENSACAO";

export type BillingInput = {
  modalidade: ModalidadeFaturamento;
  energiaInjetada: number;
  energiaCompensada: number;
  tarifaCheia: number;
  descontoPercentual: number;
  valorCemig: number;
  /** Parcela estritamente energética lida da NF, sem iluminação/multas/encargos. */
  valorEnergiaConcessionaria?: number;
  valorCreditoEfetivo?: number;
  custoDisponibilidadeRepassavel?: number;
  percentualRepasseDisponibilidade?: number;
  repassarCustoDisponibilidadeGD2?: boolean;
  repassarCustoDisponibilidade?: boolean;
  diferencaFioBRepassavel?: number;
  repassarDiferencaFioBGD2?: boolean;
  faturaSomenteAndrade?: boolean;
  /**
   * Base usada exclusivamente para comunicar a economia percentual. Em GD II,
   * o cliente continua pagando a disponibilidade na fatura da concessionária;
   * por isso o desconto real deve ser medido sobre a energia cheia, e não
   * somente sobre a parcela que restou elegível ao crédito.
   */
  baseDescontoReal?: number;
};

export type BillingOutput = {
  modalidade: ModalidadeFaturamento;
  baseCalculoKwh: number;
  tarifaCheia: number;
  tarifaAndrade: number;
  descontoContratadoPercentual: number;
  descontoContratadoValor: number;
  valorEnergiaCheia: number;
  valorUsina: number;
  valorCemig: number;
  valorCemigRepassado: number;
  valorAbsorvidoDisponibilidade: number;
  valorAbsorvidoFioB: number;
  valorTotalAbsorvido: number;
  custoDisponibilidadeRepassado: number;
  percentualRepasseDisponibilidade: number;
  repassarCustoDisponibilidadeGD2: boolean;
  repassarCustoDisponibilidade: boolean;
  diferencaFioB: number;
  diferencaFioBRepassada: number;
  repassarDiferencaFioBGD2: boolean;
  faturaSomenteAndrade: boolean;
  valorReferenciaSemAndrade: number;
  valorTotalUnificado: number;
  economiaReal: number;
  descontoRealPercentual: number;
};

function arredondar(valor: number, casas = 2) {
  return Number(valor.toFixed(casas));
}

function validarNumero(nome: string, valor: number) {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new Error(`${nome} deve ser um número maior ou igual a zero.`);
  }
}

/**
 * Na conta CEMIG GD II, o Fio B efetivamente mantido com o cliente é a
 * diferença entre a tarifa da Energia SCEE Isenta e a tarifa devolvida na
 * linha Energia compensada GD II. A tarifa cheia contém outros componentes e
 * impostos e não pode ser usada nessa subtração.
 */
export function calcularDiferencaFioB(
  energiaCompensadaGD2: number,
  tarifaScee: number,
  tarifaCompensadaGD2: number,
) {
  if (
    !Number.isFinite(energiaCompensadaGD2) || energiaCompensadaGD2 <= 0 ||
    !Number.isFinite(tarifaScee) || tarifaScee <= 0 ||
    !Number.isFinite(tarifaCompensadaGD2) || tarifaCompensadaGD2 <= 0 ||
    tarifaCompensadaGD2 >= tarifaScee
  ) return 0;

  return arredondar(energiaCompensadaGD2 * (tarifaScee - tarifaCompensadaGD2));
}

export function calcularFaturaUnificada(input: BillingInput): BillingOutput {
  validarNumero("Energia injetada", input.energiaInjetada);
  validarNumero("Energia compensada", input.energiaCompensada);
  validarNumero("Tarifa cheia", input.tarifaCheia);
  validarNumero("Valor CEMIG", input.valorCemig);

  const percentualRepasseDisponibilidade = Number(input.percentualRepasseDisponibilidade ?? 100);
  const custoDisponibilidadeRepassavel = Math.max(0, Number(input.custoDisponibilidadeRepassavel ?? 0));
  const diferencaFioBRepassavel = Math.max(0, Number(input.diferencaFioBRepassavel ?? 0));
  if (!Number.isFinite(percentualRepasseDisponibilidade) || percentualRepasseDisponibilidade < 0 || percentualRepasseDisponibilidade > 100) {
    throw new Error("Repasse da disponibilidade deve estar entre 0% e 100%.");
  }

  if (
    !Number.isFinite(input.descontoPercentual) ||
    input.descontoPercentual < 0 ||
    input.descontoPercentual > 100
  ) {
    throw new Error("Desconto percentual deve estar entre 0 e 100.");
  }

  const baseCalculoKwh =
    input.modalidade === "INJECAO"
      ? input.energiaInjetada
      : input.energiaCompensada;
  const fatorDesconto = input.descontoPercentual / 100;
  const tarifaAndrade = input.tarifaCheia * (1 - fatorDesconto);
  const valorEnergiaCheia = baseCalculoKwh * input.tarifaCheia;
  const valorUsinaSemDisponibilidade = baseCalculoKwh * tarifaAndrade;
  // A decisão sobre disponibilidade vale para GD I ou GD II; a diferença
  // do Fio B existe somente na GD II. Para UCs antigas, preservamos o
  // percentual legado.
  const repassarCustoDisponibilidade = input.repassarCustoDisponibilidade
    ?? input.repassarCustoDisponibilidadeGD2
    ?? percentualRepasseDisponibilidade > 0;
  const repassarCustoDisponibilidadeGD2 = input.repassarCustoDisponibilidadeGD2
    ?? repassarCustoDisponibilidade;
  const repassarDiferencaFioBGD2 = input.repassarDiferencaFioBGD2 ?? true;
  const custoDisponibilidadeRepassado = repassarCustoDisponibilidade
    ? custoDisponibilidadeRepassavel
    : 0;
  const diferencaFioBRepassada = repassarDiferencaFioBGD2
    ? diferencaFioBRepassavel
    : 0;
  // O que não for repassado é assumido pela Andrade. Disponibilidade e Fio B
  // continuam visíveis na conta CEMIG, mas o crédito é materializado como
  // abatimento na fatura Andrade, nunca como alteração da fatura original da
  // concessionária.
  const valorAbsorvidoDisponibilidade = custoDisponibilidadeRepassavel - custoDisponibilidadeRepassado;
  const valorAbsorvidoFioB = diferencaFioBRepassavel - diferencaFioBRepassada;
  // O abatimento não pode tornar a fatura Andrade negativa.
  const valorTotalAbsorvido = Math.min(
    valorUsinaSemDisponibilidade,
    Math.max(0, valorAbsorvidoDisponibilidade + valorAbsorvidoFioB)
  );
  const faturaSomenteAndrade = Boolean(input.faturaSomenteAndrade);
  const valorUsina = Math.max(0, valorUsinaSemDisponibilidade - valorTotalAbsorvido);
  const valorCemigRepassado = input.valorCemig;
  const descontoContratadoValor = valorEnergiaCheia - valorUsinaSemDisponibilidade;
  // "Quanto pagaria sem a Andrade" usa a tarifa cheia da CEMIG, que já inclui
  // ICMS, PASEP e COFINS. Somar os tributos destacados novamente duplicaria
  // impostos. Multas, iluminação e cobranças extraordinárias ficam de fora.
  // Sem a usina também não há Fio B nem disponibilidade GD nessa referência.
  const valorReferenciaSemAndrade = valorEnergiaCheia;
  const valorTotalUnificado = (faturaSomenteAndrade ? 0 : valorCemigRepassado) + valorUsina;
  // A comparação do desconto usa somente a composição energética. Iluminação
  // pública, multas, bandeiras e encargos ficam no total exibido/pago, mas não
  // entram na projeção porque existem com ou sem a usina.
  const valorCemigParaProjecao = Math.max(0, Number(input.valorEnergiaConcessionaria ?? input.valorCemig));
  // A absorção devolve custos ao cliente, mas nunca pode transformar o desconto
  // real em um percentual superior ao desconto contratado sobre a energia.
  // Essa trava também elimina diferenças residuais de centavos entre as linhas
  // da concessionária e os componentes extraídos do PDF.
  const economiaReal = Math.min(
    descontoContratadoValor,
    Math.max(0, valorReferenciaSemAndrade - (valorCemigParaProjecao + valorUsina)),
  );
  const baseDescontoReal = Math.max(
    0,
    input.baseDescontoReal ?? valorReferenciaSemAndrade
  );
  const descontoRealPercentual =
    baseDescontoReal > 0
      ? (economiaReal / baseDescontoReal) * 100
      : 0;

  return {
    modalidade: input.modalidade,
    baseCalculoKwh: arredondar(baseCalculoKwh, 3),
    tarifaCheia: arredondar(input.tarifaCheia, 6),
    tarifaAndrade: arredondar(tarifaAndrade, 6),
    descontoContratadoPercentual: arredondar(input.descontoPercentual),
    descontoContratadoValor: arredondar(descontoContratadoValor),
    valorEnergiaCheia: arredondar(valorEnergiaCheia),
    valorUsina: arredondar(valorUsina),
    valorCemig: arredondar(input.valorCemig),
    valorCemigRepassado: arredondar(valorCemigRepassado),
    valorAbsorvidoDisponibilidade: arredondar(valorAbsorvidoDisponibilidade),
    valorAbsorvidoFioB: arredondar(valorAbsorvidoFioB),
    valorTotalAbsorvido: arredondar(valorTotalAbsorvido),
    custoDisponibilidadeRepassado: arredondar(custoDisponibilidadeRepassado),
    percentualRepasseDisponibilidade: arredondar(percentualRepasseDisponibilidade),
    repassarCustoDisponibilidadeGD2,
    repassarCustoDisponibilidade,
    diferencaFioB: arredondar(diferencaFioBRepassavel),
    diferencaFioBRepassada: arredondar(diferencaFioBRepassada),
    repassarDiferencaFioBGD2,
    faturaSomenteAndrade,
    valorReferenciaSemAndrade: arredondar(valorReferenciaSemAndrade),
    valorTotalUnificado: arredondar(valorTotalUnificado),
    economiaReal: arredondar(economiaReal),
    descontoRealPercentual: arredondar(descontoRealPercentual, 4),
  };
}
