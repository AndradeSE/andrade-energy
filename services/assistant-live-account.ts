import { detectCapability } from "./assistant-capabilities";
import { executeAssistantTool, type AssistantAccountContext } from "./assistant-tools";
import { normalizeAssistantQuery, asksLatestInvoiceAmount } from "./local-assistant";
import { asksLatestInvoiceDocument, asksOverdueInvoices, invoiceDocumentChoices, latestInvoiceAmountReply, overdueInvoiceReply } from "./local-assistant-invoices";
import { listarFaturas } from "./faturas.service";
import { detectProductionMetric, productionMetricReply } from "./assistant-production";
import { buscarDashboardUsina } from "./usinas.service";
import { detectFinancialMetric, financialMetricReply } from "./assistant-financial";
import { carregarFinanceiro } from "./financeiro.service";
import { detectAccountQuery, consultAccount } from "./assistant-account";
import type { AssistantToolReply } from "./assistant-capabilities";

export type LiveAccountReply = AssistantToolReply & { invoiceId?: string; invoiceChoices?: Array<{ id: string; label: string }> };

// Contexto vem da sessão do app. O modelo não fornece IDs, URLs ou endpoints.
export async function queryLiveAccount(question: string, ctx: AssistantAccountContext): Promise<LiveAccountReply> {
  const text = normalizeAssistantQuery(question);
  const capability = detectCapability(text);
  const document = asksLatestInvoiceDocument(text);
  const overdue = asksOverdueInvoices(text);
  const financial = detectFinancialMetric(text);
  if (capability && !overdue && !(document && !capability.review && ["usinas", "faturamento", "pagamento"].includes(capability.module))) {
    return executeAssistantTool(capability, ctx, text);
  }
  if (overdue || document || asksLatestInvoiceAmount(text) || (!financial && /\bfaturas?\b/.test(text))) {
    if (ctx.generator && !ctx.plantId) return { text: "Selecione a usina para consultar suas faturas." };
    if (!ctx.generator && !ctx.unitNumber && !ctx.clientId) return { text: "Selecione sua UC para consultar suas faturas." };
    const invoices = ctx.generator ? await listarFaturas(undefined, undefined, ctx.plantId) : await listarFaturas(ctx.clientId, ctx.unitNumber);
    if (overdue) return { text: overdueInvoiceReply(invoices).text };
    if (document) {
      const candidates = invoiceDocumentChoices(text, invoices);
      const available = candidates.filter(item => item.pdf_unificada_url);
      if (!available.length) return { text: "Não encontrei um PDF disponível para esse pedido nos registros da conta selecionada." };
      if (available.length === 1) return { text: `Encontrei a fatura ${available[0].referencia ?? "mais recente"}. O PDF está disponível no chat da Ajuda.`, invoiceId: available[0].id };
      return { text: "Encontrei vários PDFs; as opções estão disponíveis no chat da Ajuda para você escolher.", invoiceChoices: available.map(item => ({ id: item.id, label: `PDF · ${item.referencia ?? "Fatura"}` })) };
    }
    return { text: latestInvoiceAmountReply(invoices) };
  }
  const production = detectProductionMetric(text);
  if (production) return ctx.plantId ? { text: productionMetricReply(await buscarDashboardUsina(ctx.plantId), production) } : { text: "Selecione a usina para consultar sua produção." };
  if (financial && ctx.generator) return ctx.plantId ? { text: financialMetricReply(await carregarFinanceiro(ctx.plantId), financial) } : { text: "Selecione a usina para consultar o financeiro." };
  const account = detectAccountQuery(text);
  if (account) return { text: await consultAccount(account, ctx.generator, ctx.plantId) };
  return { text: "Especifique qual informação da conta você deseja: faturas, produção, financeiro, clientes, UCs ou contratos." };
}

export function redactLiveAccountText(text: string) {
  return text.replace(/https?:\/\/\S+/gi, "[link disponível no aplicativo]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[e-mail disponível no perfil]")
    .replace(/(?:senha|password|token|api[ _-]?key|código de acesso|codigo de acesso)\s*[:=]\s*\S+/gi, "[credencial omitida]")
    .replace(/(?:Telefone|Endereço|CPF|CNPJ)\s*:[^\n]+/gi, "[dado disponível no perfil]").slice(0, 3000);
}
