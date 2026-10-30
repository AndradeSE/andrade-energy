export function diasParaLembreteFatura(fatura: any, hoje: string): number | null {
  if (String(fatura.status).toUpperCase() !== "ABERTA" || !fatura.vencimento || fatura.pago_em) return null;
  const cobrancas = fatura.cobrancas ?? [];
  if (cobrancas.some((c: any) => c.pago_em || ["PAGA", "PAGO", "QUITADA", "RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "CANCELADA", "CANCELADO", "DELETED", "REFUNDED"].includes(String(c.status).toUpperCase()))) return null;
  const dias = (Date.parse(`${String(fatura.vencimento).slice(0, 10)}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86400000;
  return Number.isInteger(dias) && dias >= 0 && dias <= 5 ? dias : null;
}

export function avisoCobrancaVencida(fatura: any, hoje: string): { dias: number; etapa: number } | null {
  if (!["ABERTA", "VENCIDA"].includes(String(fatura.status).toUpperCase()) || fatura.pago_em) return null;
  if ((fatura.cobrancas ?? []).some((c: any) => c.pago_em || ["PAGA", "PAGO", "QUITADA", "RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "CANCELADA", "CANCELADO", "DELETED", "REFUNDED"].includes(String(c.status).toUpperCase()))) return null;
  const data = String(fatura.vencimento ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const dias = (Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${data}T12:00:00Z`)) / 86400000;
  if (!Number.isInteger(dias) || dias < 1) return null;
  const etapa = dias >= 30 ? Math.floor(dias / 30) * 30 : dias >= 15 ? 15 : dias >= 7 ? 7 : 1;
  return { dias, etapa };
}
