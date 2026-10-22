import { chaveCompetencia } from "../dashboard/competencia.policy";

export function receitaAtualDaCompetencia(faturas: any[], competencia: string, fechamento?: any) {
  const periodo = faturas.filter(f => chaveCompetencia(f.referencia) === chaveCompetencia(competencia));
  if (!periodo.length) return {
    receitaPrevista: Number(fechamento?.receita_prevista ?? 0),
    receitaRealizada: Number(fechamento?.receita_realizada ?? 0),
  };
  const valor = (f: any) => Math.max(0, Number(f.valor_total_unificado ?? f.valor_total ?? 0) || 0);
  const paga = (f: any) => ["PAGO", "PAGA"].includes(String(f.status ?? "").toUpperCase()) ||
    (f.cobrancas ?? []).some((c: any) => ["PAGO", "PAGA"].includes(String(c.status ?? "").toUpperCase()) || Boolean(c.pago_em));
  return {
    receitaPrevista: periodo.reduce((total, f) => total + valor(f), 0),
    receitaRealizada: periodo.filter(paga).reduce((total, f) => total + valor(f), 0),
  };
}
