export type ConfiguracaoSimulacao = {
  consumo: number; compensacao: number; injecao: number; tarifa: number; desconto: number;
  modalidade: 'INJECAO' | 'COMPENSACAO'; tipoGd: 'GD1' | 'GD2';
  disponibilidade: number; fioB: number; iluminacao: number;
  repassarDisponibilidade: boolean; repassarFioB: boolean;
};
const moeda = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
export function simularFaturas(c: ConfiguracaoSimulacao) {
  for (const [nome, valor] of Object.entries(c)) {
    if (typeof valor === 'number' && (!Number.isFinite(valor) || valor < 0)) throw new Error(`Confira o campo ${nome}.`);
  }
  if (c.consumo <= 0 || c.tarifa <= 0 || c.desconto > 100 || c.compensacao > c.consumo) throw new Error('Confira consumo, tarifa, desconto e energia compensada (que não pode superar o consumo).');
  const energiaSemDesconto = c.consumo * c.tarifa;
  const energiaResidual = (c.consumo - c.compensacao) * c.tarifa;
  const fioB = c.tipoGd === 'GD2' ? c.fioB : 0;
  const baseAndrade = (c.modalidade === 'INJECAO' ? c.injecao : c.compensacao) * c.tarifa;
  // Mesma política do faturamento: custos absorvidos viram abatimento da
  // Andrade e nunca alteram o documento original da concessionária.
  const abatimento = Math.min(baseAndrade * (1-c.desconto/100),
    (c.repassarDisponibilidade ? 0 : c.disponibilidade) + (c.repassarFioB ? 0 : fioB));
  const andrade = moeda(Math.max(0, baseAndrade * (1-c.desconto/100) - abatimento));
  const cemigComAndrade = moeda(energiaResidual + c.disponibilidade + fioB + c.iluminacao);
  const cemigSemAndrade = moeda(energiaSemDesconto + c.iluminacao);
  const totalComAndrade = moeda(andrade + cemigComAndrade);
  const economia = moeda(cemigSemAndrade - totalComAndrade);
  return {cemigSemAndrade, cemigComAndrade, andrade, totalComAndrade, economia,
    economiaAnual: moeda(economia*12), percentual: cemigSemAndrade > 0 ? economia/cemigSemAndrade*100 : 0,
    abatimento: moeda(abatimento), iluminacao: moeda(c.iluminacao)};
}
