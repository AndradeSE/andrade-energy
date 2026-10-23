import { invoiceDisplayStatus } from '../services/invoice-display-status';

export type FinancialHistoryEntry = {
  id: string; kind: 'COBRANCA' | 'TRANSFERENCIA'; title: string; status: string;
  settled: boolean; failed: boolean; amount: number | null; gross: number | null;
  net: number | null; fee: number | null; updatedAt: string | null; createdAt: string | null;
  invoiceId?: string; destination?: string;
};
const amount = (value: unknown) => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.round(Number(value) * 100) / 100 : null;
const validDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;

/** A record is a current transaction state, not a new cash movement on each webhook. */
export function financialHistory(charges: Record<string, any>[] = [], transfers: Record<string, any>[] = []): FinancialHistoryEntry[] {
  const entries: FinancialHistoryEntry[] = charges.map(item => {
    const invoice = Array.isArray(item.faturas) ? item.faturas[0] : item.faturas;
    const raw = String(item.status ?? '').toUpperCase();
    const settled = raw === 'RECEIVED';
    const gross = amount(item.valor); const net = amount(item.valor_liquido);
    const labels: Record<string, string> = { RECEIVED: 'Recebido', CONFIRMED: 'Pago · aguardando liberação', RECEIVED_IN_CASH: 'Recebido fora do Asaas', REFUNDED: 'Estornada', REFUND_REQUESTED: 'Estorno solicitado', REFUND_IN_PROGRESS: 'Estorno em processamento', DELETED: 'Cancelada', CANCELLED: 'Cancelada', CHARGEBACK_REQUESTED: 'Contestada', CHARGEBACK_DISPUTE: 'Em contestação', AWAITING_CHARGEBACK_REVERSAL: 'Reversão em análise' };
    return { id: `cobranca:${item.id}`, kind: 'COBRANCA', title: `Cobrança${invoice?.referencia ? ` · ${invoice.referencia}` : ''}`,
      status: labels[raw] ?? (['PENDING', 'OVERDUE'].includes(raw) ? invoiceDisplayStatus({ status: raw, vencimento: invoice?.vencimento }).label : 'Status em conferência'),
      settled, failed: ['REFUNDED', 'DELETED', 'CANCELLED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE'].includes(raw),
      amount: settled && net !== null ? net : gross, gross, net, fee: gross !== null && net !== null && net <= gross ? Math.round((gross - net) * 100) / 100 : null,
      updatedAt: validDate(item.atualizado_em), createdAt: validDate(item.criado_em), invoiceId: item.fatura_id || undefined };
  });
  entries.push(...transfers.map((item): FinancialHistoryEntry => {
    const raw = String(item.status ?? '').toUpperCase();
    const labels: Record<string, string> = { DONE: 'Concluída', PENDING: 'Em processamento', BANK_PROCESSING: 'Em processamento', AUTHORIZING: 'Aguardando autorização', BLOCKED: 'Bloqueada', UNKNOWN: 'Resultado em conferência', FAILED: 'Não concluída', CANCELLED: 'Cancelada', REFUSED: 'Recusada' };
    return { id: `transferencia:${item.id}`, kind: 'TRANSFERENCIA', title: item.modalidade === 'AUTOMATICA' ? 'Transferência automática' : 'Transferência Pix',
      status: labels[raw] ?? 'Status em conferência', settled: raw === 'DONE', failed: ['FAILED', 'CANCELLED', 'REFUSED'].includes(raw),
      amount: amount(item.valor), gross: null, net: null, fee: null,
      updatedAt: validDate(item.atualizado_em), createdAt: validDate(item.criado_em), destination: item.destino_mascarado || undefined };
  }));
  return entries.sort((a, b) => Date.parse(b.updatedAt ?? b.createdAt ?? '1970-01-01') - Date.parse(a.updatedAt ?? a.createdAt ?? '1970-01-01') || a.id.localeCompare(b.id));
}
