export function diasParaLembreteFatura(fatura: any, hoje: string): number | null {
  if (String(fatura.status).toUpperCase() !== "ABERTA" || !fatura.vencimento) return null;
  const cobrancas = fatura.cobrancas ?? [];
  if (cobrancas.some((c: any) => ["PAGA", "PAGO", "QUITADA", "RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "CANCELADA", "CANCELADO", "DELETED", "REFUNDED"].includes(String(c.status).toUpperCase()))) return null;
  const dias = (Date.parse(`${String(fatura.vencimento).slice(0, 10)}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86400000;
  return Number.isInteger(dias) && dias >= 0 && dias <= 5 ? dias : null;
}
