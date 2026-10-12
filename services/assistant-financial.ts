import type { ResumoFinanceiro } from "./financeiro.service";

export type FinancialMetric = "receitaPrevista" | "receitaRecebida" | "valorEmAberto" | "totalFaturas";

export function detectFinancialMetric(question: string): FinancialMetric | undefined {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(em aberto|pendente|a receber)\b/.test(text) && /\b(valor|quanto|total|receita|fatura)\b/.test(text)) return "valorEmAberto";
  if (/\b(receita prevista|previsto faturar|previsao de receita)\b/.test(text)) return "receitaPrevista";
  if (/\b(receita recebida|quanto recebi|total recebido|valor recebido)\b/.test(text)) return "receitaRecebida";
  if (/\b(quantas faturas|numero de faturas|total de faturas)\b/.test(text)) return "totalFaturas";
  return undefined;
}

export function financialMetricReply(summary: ResumoFinanceiro, metric: FinancialMetric): string {
  const value = summary[metric];
  if (typeof value !== "number" || !Number.isFinite(value)) return "Não consegui confirmar esse dado financeiro. Confira a aba Financeiro.";
  if (metric === "totalFaturas") return `O resumo financeiro da usina selecionada mostra ${value} fatura${value === 1 ? "" : "s"}. Confira o período na aba Financeiro.`;
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const label = metric === "valorEmAberto" ? "valor em aberto" : metric === "receitaRecebida" ? "receita recebida" : "receita prevista";
  return `No resumo financeiro da usina selecionada, ${label}: ${formatted}. Confira o período e os detalhes na aba Financeiro.`;
}
