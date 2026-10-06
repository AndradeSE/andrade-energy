type InvoiceSnapshot = { id: string; status?: string; created_at?: string; referencia?: string; valor_total_unificado?: number; valor_total?: number; pdf_unificada_url?: string };

export function asksLatestInvoiceDocument(input: string, previousInvoiceRequest = false) {
  const text = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const mentionsInvoice = /\b(fatura|cobranca)\b/.test(text);
  const mentionsLatest = /\b(ultima|ultimo|mais recente)\b/.test(text);
  const asksDocument = /\b(pdf|arquivo|documento|abrir|baixar|download|enviar|envie|mandar|manda|mostre|mostrar|quero|me de|me da|aqui)\b/.test(text);
  return (mentionsInvoice && mentionsLatest && asksDocument)
    || (previousInvoiceRequest && asksDocument && /\b(pdf|fatura|arquivo|documento|aqui|me de|mandar|manda)\b/.test(text));
}

export function latestIssuedInvoice(invoices: InvoiceSnapshot[]) {
  return invoices
    .filter(invoice => !["RASCUNHO", "CANCELADA", "EXCLUIDA"].includes(String(invoice.status ?? "").toUpperCase()))
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || String(b.referencia ?? "").localeCompare(String(a.referencia ?? "")))[0];
}

function formatReference(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[1]}` : value;
}

export function latestInvoiceAmountReply(invoices: InvoiceSnapshot[]): string {
  const latest = latestIssuedInvoice(invoices);
  if (!latest) return "Não encontrei uma fatura emitida para esta conta no momento.";
  const amount = Number(latest.valor_total_unificado ?? latest.valor_total);
  if (!Number.isFinite(amount)) return "Encontrei a última fatura, mas ela não tem um valor confirmado. Confira os detalhes em Faturas.";
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  const reference = latest.referencia ? `, referência ${formatReference(latest.referencia)}` : "";
  return `A última fatura emitida foi de ${formatted}${reference}. Consulte Faturas para conferir os detalhes.`;
}
