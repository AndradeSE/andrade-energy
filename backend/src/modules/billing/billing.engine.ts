export type BillingInput = {
  consumo: number;
  energiaCompensada: number;
  custoDisponibilidade: number;
  tarifaCheia: number;
  desconto: number;
};

export type BillingOutput = {
  valorEnergia: number;
  valorDisponibilidade: number;
  valorTotal: number;
  economiaCliente: number;
};

function round(valor: number) {
  return Number(valor.toFixed(2));
}

export function calcularBoleto(
  input: BillingInput
): BillingOutput {

  const tarifaAndrade =
    input.tarifaCheia * (1 - input.desconto);

  const valorEnergia =
    input.energiaCompensada *
    tarifaAndrade;

  const valorTotal =
    valorEnergia +
    input.custoDisponibilidade;

  const economia =
    (input.energiaCompensada *
      input.tarifaCheia) -
    valorEnergia;

  return {

    valorEnergia:
      round(valorEnergia),

    valorDisponibilidade:
      round(input.custoDisponibilidade),

    valorTotal:
      round(valorTotal),

    economiaCliente:
      round(economia),

  };

}