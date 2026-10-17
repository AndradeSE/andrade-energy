import { chaveCompetencia } from "../dashboard/competencia.policy";

export function faturamentoDoFechamento(fechamento: any, faturas: any[]) {
  const validas = faturas.filter(f => f.empresa_id === fechamento.empresa_id
    && f.usina_id === fechamento.usina_id
    && chaveCompetencia(f.referencia) === chaveCompetencia(fechamento.competencia)
    && !["RASCUNHO", "CADASTRO", "ANEXADA", "CANCELADA", "CANCELADO", "ESTORNADA"].includes(String(f.status).toUpperCase()));
  const numero = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
  const total = (f: any) => numero(f.valor_total_unificado ?? f.valor_total);
  const paga = (f: any) => ["PAGO", "PAGA", "RECEBIDA", "RECEBIDO"].includes(String(f.status).toUpperCase())
    || (f.cobrancas ?? []).some((c: any) => c.pago_em || ["PAGO", "PAGA", "RECEIVED", "CONFIRMED"].includes(String(c.status).toUpperCase()));
  const prevista = validas.reduce((s, f) => s + total(f), 0);
  const recebida = validas.filter(paga).reduce((s, f) => s + total(f), 0);
  return {
    receita_prevista_faturas: prevista,
    receita_recebida_faturas: recebida,
    receita_pendente_faturas: Math.max(0, prevista - recebida),
    compensacoes_faturas: validas.filter(f => f.energia_compensada != null && numero(f.energia_compensada) > 0).map(f => ({
      id: f.id, cliente: f.clientes?.nome ?? "Cliente", uc: f.numero_instalacao ?? f.unidades_consumidoras?.numero ?? null,
      energia_compensada: numero(f.energia_compensada), energia_injetada: f.energia_injetada == null ? null : numero(f.energia_injetada),
      economia: f.economia_real == null ? null : numero(f.economia_real), referencia: f.referencia,
    })),
  };
}
