export type ModalidadeFaturamento = "INJECAO" | "COMPENSACAO";

export type BillingInput = {
  modalidade: ModalidadeFaturamento;
  energiaInjetada: number;
  energiaCompensada: number;
  tarifaCheia: number;
  descontoPercentual: number;
  valorCemig: number;
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
  const valorUsina = baseCalculoKwh * tarifaAndrade;
  const descontoContratadoValor = valorEnergiaCheia - valorUsina;
  const valorReferenciaSemAndrade = input.valorCemig + valorEnergiaCheia;
  const valorTotalUnificado = input.valorCemig + valorUsina;
  const economiaReal = valorReferenciaSemAndrade - valorTotalUnificado;
  const descontoRealPercentual =
    valorReferenciaSemAndrade > 0
      ? (economiaReal / valorReferenciaSemAndrade) * 100
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
    valorReferenciaSemAndrade: arredondar(valorReferenciaSemAndrade),
    valorTotalUnificado: arredondar(valorTotalUnificado),
    economiaReal: arredondar(economiaReal),
    descontoRealPercentual: arredondar(descontoRealPercentual, 4),
  };
}
