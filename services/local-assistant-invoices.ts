type InvoiceSnapshot = { id: string; status?: string; vencimento?: string; pago_em?: string; cobrancas?: Array<{ status?: string; pago_em?: string }>; created_at?: string; referencia?: string; valor_total_unificado?: number; valor_total?: number; pdf_unificada_url?: string; pdf_cemig_url?: string };

export function asksOverdueInvoices(input: string) {
  const text = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(faturas?|cobrancas?|boletos?|contas?|dividas?)\b/.test(text) && /\b(atrasad[ao]s?|vencid[ao]s?|em atraso|em aberto|pendentes?|devendo)\b/.test(text);
}

export function overdueInvoiceReply(invoices: InvoiceSnapshot[], today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())) {
  const settled = ["PAGO", "PAGA", "RECEBIDO", "RECEBIDA", "RECEIVED", "CONFIRMED"];
  const overdue = invoices.filter(invoice => {
    const status = String(invoice.status ?? "").toUpperCase();
    if ([...settled, "RASCUNHO", "CANCELADA", "EXCLUIDA", "CANCELADO"].includes(status) || invoice.pago_em || invoice.cobrancas?.some(c => c.pago_em || settled.includes(String(c.status ?? "").toUpperCase()))) return false;
    return ["VENCIDA", "ATRASADA", "OVERDUE"].includes(status) || (["ABERTA", "PENDENTE", "PENDING", "EMITIDA"].includes(status) && /^\d{4}-\d{2}-\d{2}/.test(invoice.vencimento ?? "") && invoice.vencimento!.slice(0, 10) < today);
  });
  return { invoices: overdue, text: overdue.length ? `Encontrei ${overdue.length} fatura(s) em atraso neste contexto.\n${overdue.slice(0, 12).map(f => `${f.referencia ?? "Fatura"} · vencimento ${f.vencimento?.slice(0, 10) ?? "não informado"} · ${Number.isFinite(Number(f.valor_total_unificado ?? f.valor_total)) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(f.valor_total_unificado ?? f.valor_total)) : "valor não informado"}`).join("\n")}\nA consulta reflete os pagamentos registrados no aplicativo.` : "Não identifiquei faturas em atraso nos registros deste contexto. Pagamentos ainda não sincronizados podem alterar o resultado." };
}

export function asksLatestInvoiceDocument(input: string, previousInvoiceRequest = false) {
  const text = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const mentionsInvoice = /\b(fatura|cobranca)\b/.test(text);
  const mentionsLatest = /\b(ultima|ultimo|mais recente)\b/.test(text);
  const asksDocument = /\b(pdf|arquivo|documento|abrir|baixar|download|enviar|envie|mandar|manda|mostre|mostrar|quero|me de|me da|aqui)\b/.test(text);
  const explicitDocument = /\b(pdf|arquivo|documento|baixar|download|envie|manda|mandar|enviar|abrir|mostre|mostrar)\b/.test(text);
  const creatingInvoice = /\b(emitir|faturar|gerar|criar)\b/.test(text);
  return (mentionsInvoice && !creatingInvoice && asksDocument && (mentionsLatest || explicitDocument))
    || (previousInvoiceRequest && asksDocument && /\b(pdf|fatura|arquivo|documento|aqui|me de|mandar|manda)\b/.test(text));
}

export function latestIssuedInvoice(invoices: InvoiceSnapshot[]) {
  return invoices
    .filter(invoice => !["RASCUNHO", "CANCELADA", "EXCLUIDA"].includes(String(invoice.status ?? "").toUpperCase()))
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || String(b.referencia ?? "").localeCompare(String(a.referencia ?? "")))[0];
}

export function invoiceDocumentChoices(question: string, invoices: InvoiceSnapshot[]) {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const namedMonth = months.findIndex(month => new RegExp(`\\b${month}\\b`).test(text));
  const numeric = /\b(0?[1-9]|1[012])[/-](20\d{2})\b/.exec(text);
  const year = numeric?.[2] ?? /\b20\d{2}\b/.exec(text)?.[0];
  const month = numeric ? Number(numeric[1]) : namedMonth >= 0 ? namedMonth + 1 : undefined;
  let candidates = invoices.filter(invoice => !["RASCUNHO", "CANCELADA", "EXCLUIDA"].includes(String(invoice.status ?? "").toUpperCase()));
  if (month || year) candidates = candidates.filter(invoice => {
    const ref = String(invoice.referencia ?? "").toLowerCase();
    const iso = /^(20\d{2})-(\d{2})/.exec(ref);
    const br = /^(\d{1,2})\/(20\d{2})/.exec(ref);
    const named = months.findIndex(name => ref.startsWith(name.slice(0, 3)));
    const refMonth = iso ? Number(iso[2]) : br ? Number(br[1]) : named >= 0 ? named + 1 : undefined;
    const refYear = iso?.[1] ?? br?.[2] ?? /20\d{2}/.exec(ref)?.[0];
    return (!month || refMonth === month) && (!year || refYear === year);
  });
  candidates.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  if (/\b(ultima|ultimo|mais recente)\b/.test(text) && !month && !year) candidates = candidates.slice(0, 1);
  return candidates.slice(0, 12);
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
