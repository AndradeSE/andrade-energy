export type ModalidadeFaturamento = "INJECAO" | "COMPENSACAO";

export type BillingInput = {
  modalidade: ModalidadeFaturamento;
  energiaInjetada: number;
  energiaCompensada: number;
  tarifaCheia: number;
  descontoPercentual: number;
  valorCemig: number;
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
  // O que não for repassado é absorvido pela Andrade como desconto adicional.
  const valorUsina = Math.max(
    0,
    valorUsinaSemDisponibilidade
      - (custoDisponibilidadeRepassavel - custoDisponibilidadeRepassado)
      - (diferencaFioBRepassavel - diferencaFioBRepassada)
  );
  const descontoContratadoValor = valorEnergiaCheia - valorUsina;
  const valorCreditoEfetivo = Math.min(
    valorEnergiaCheia,
    Math.max(0, input.valorCreditoEfetivo ?? valorEnergiaCheia)
  );
  const valorReferenciaSemAndrade = input.valorCemig + valorCreditoEfetivo;
  const faturaSomenteAndrade = Boolean(input.faturaSomenteAndrade);
  const valorTotalUnificado = (faturaSomenteAndrade ? 0 : input.valorCemig) + valorUsina;
  // A economia considera o desembolso total do cliente. Mesmo quando a conta
  // CEMIG é paga separadamente, ela não pode parecer uma economia da Andrade.
  const economiaReal = Math.max(0, valorReferenciaSemAndrade - (input.valorCemig + valorUsina));
  const baseDescontoReal = Math.max(
    0,
    input.baseDescontoReal ?? valorCreditoEfetivo
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
