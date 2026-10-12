/** Corrige somente o demonstrativo de benefício; não altera a cobrança. */
export function demonstrativoCompensacao(fatura: any, valorEnergiaConcessionaria: number) {
  if ([fatura.energia_compensada, fatura.tarifa_cheia, fatura.tarifa_andrade,
    fatura.desconto_contratado_percentual ?? fatura.desconto_percentual].some(v => v == null)) return null;
  const compensada = Number(fatura.energia_compensada);
  const tarifa = Number(fatura.tarifa_cheia);
  const tarifaAndrade = Number(fatura.tarifa_andrade);
  const desconto = Number(fatura.desconto_contratado_percentual ?? fatura.desconto_percentual);
  const absorvido = Number(fatura.valor_total_absorvido ?? 0);
  if (![compensada, tarifa, tarifaAndrade, desconto, absorvido, valorEnergiaConcessionaria].every(Number.isFinite)
    || [compensada, tarifa, tarifaAndrade, absorvido, valorEnergiaConcessionaria].some(v => v < 0)
    || desconto < 0 || desconto > 100) return null;
  const referencia = compensada * tarifa;
  const parcelaCompensada = Math.max(0, compensada * tarifaAndrade - absorvido);
  const economia = Math.min(referencia * desconto / 100, Math.max(0, referencia - valorEnergiaConcessionaria - parcelaCompensada));
  return {
    valor_referencia_sem_andrade: Number(referencia.toFixed(2)),
    economia_real: Number(economia.toFixed(2)),
    economia: Number(economia.toFixed(2)),
    desconto_real_percentual: Number((referencia > 0 ? economia / referencia * 100 : 0).toFixed(4)),
  };
}
