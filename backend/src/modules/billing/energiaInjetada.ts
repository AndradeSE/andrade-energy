/** Créditos recebidos pela UC na competência, em kWh. */
export function calcularEnergiaInjetadaPelosSaldos(
  energiaCompensada: number,
  saldoAtual: number,
  saldoAnterior = 0,
): number {
  if (![energiaCompensada, saldoAtual, saldoAnterior].every(Number.isFinite)) {
    throw new Error("Compensação e saldos da fatura devem ser valores válidos.");
  }
  const energia = Number((energiaCompensada + saldoAtual - saldoAnterior).toFixed(3));
  if (energia < 0) {
    throw new Error("A compensação e os saldos da UC resultaram em energia injetada negativa. Confira o saldo anterior e a fatura.");
  }
  return energia;
}
