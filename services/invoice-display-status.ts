type Invoice = { id?: string; status?: string; vencimento?: string; pago_em?: string | null; data_pagamento?: string | null; cobrancas?: { status?: string; pago_em?: string | null }[] };
const normalizar = (valor: unknown) => String(valor ?? "").trim().toUpperCase();
const pagos = new Set(["PAGA", "PAGO", "QUITADA", "RECEBIDA", "RECEBIDO", "RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

export function invoiceDisplayStatus(invoice: Invoice, hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())) {
  const status = normalizar(invoice.status);
  // Um registro auxiliar pendente não desfaz a baixa já confirmada da fatura.
  const paga = pagos.has(status) || Boolean(invoice.pago_em || invoice.data_pagamento)
    || Boolean(invoice.cobrancas?.some(c => pagos.has(normalizar(c.status)) || c.pago_em));
  if (paga) return { paga: true, vencida: false, label: "Paga", variant: "success" as const };
  if (["CANCELADA", "CANCELADO", "EXCLUIDA", "DELETED", "REFUNDED"].includes(status)) return { paga: false, vencida: false, label: "Cancelada", variant: "info" as const };
  if (status === "RASCUNHO") return { paga: false, vencida: false, label: "Rascunho", variant: "info" as const };
  const vencida = ["VENCIDA", "ATRASADA", "OVERDUE"].includes(status)
    || (/^\d{4}-\d{2}-\d{2}/.test(invoice.vencimento ?? "") && invoice.vencimento!.slice(0, 10) < hoje);
  return { paga: false, vencida, label: vencida ? "Vencida" : "Em aberto", variant: vencida ? "danger" as const : "warning" as const };
}
