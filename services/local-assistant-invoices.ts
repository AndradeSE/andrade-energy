type InvoiceSnapshot = { id: string; status?: string; created_at?: string; referencia?: string; valor_total_unificado?: number; valor_total?: number };

function formatReference(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[1]}` : value;
}

export function latestInvoiceAmountReply(invoices: InvoiceSnapshot[]): string {
  const valid = invoices.filter(invoice => !["RASCUNHO", "CANCELADA", "EXCLUIDA"].includes(String(invoice.status ?? "").toUpperCase()));
  const latest = [...valid].sort((a, b) => {
    const created = String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
    return created || String(b.referencia ?? "").localeCompare(String(a.referencia ?? ""));
  })[0];
  if (!latest) return "Não encontrei uma fatura emitida para esta conta no momento.";
  const amount = Number(latest.valor_total_unificado ?? latest.valor_total);
  if (!Number.isFinite(amount)) return "Encontrei a última fatura, mas ela não tem um valor confirmado. Confira os detalhes em Faturas.";
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  const reference = latest.referencia ? `, referência ${formatReference(latest.referencia)}` : "";
  return `A última fatura emitida foi de ${formatted}${reference}. Consulte Faturas para conferir os detalhes.`;
}
