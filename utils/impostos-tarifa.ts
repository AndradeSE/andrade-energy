export function tarifaComTributos(tarifa: number, icms: number, pis: number, cofins: number): number {
  const aliquotas = [icms, pis, cofins];
  if (!Number.isFinite(tarifa) || tarifa <= 0 || aliquotas.some(v => !Number.isFinite(v) || v < 0 || v >= 100) || icms + pis + cofins >= 100) {
    throw new Error('Confira a tarifa e as alíquotas de ICMS, PIS e Cofins.');
  }
  return tarifa / ((1 - icms / 100) * (1 - (pis + cofins) / 100));
}

export function aplicarImpostosNaTarifa(tarifa: string, icms: string, pis: string, cofins: string): number {
  if (!tarifa.trim()) throw new Error('Busque a tarifa oficial ou preencha a tarifa sem impostos acima.');
  const faltantes = [['ICMS', icms], ['PIS', pis], ['Cofins', cofins]].filter(([, valor]) => !valor.trim()).map(([nome]) => nome);
  if (faltantes.length) throw new Error('Preencha ' + faltantes.join(', ') + ' com as alíquotas da fatura. Use 0 somente se houver isenção.');
  const numero = (valor: string) => Number(valor.trim().replace(/\./g, '').replace(',', '.'));
  return tarifaComTributos(numero(tarifa), numero(icms), numero(pis), numero(cofins));
}
