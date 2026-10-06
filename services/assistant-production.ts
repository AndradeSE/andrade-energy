export type ProductionMetric = "energiaGerada" | "energiaTotal" | "energiaDisponivel" | "ocupacao";

export function detectProductionMetric(question: string): ProductionMetric | undefined {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(ocupacao|ocupada)\b/.test(text)) return "ocupacao";
  if (/\b(energia|geracao|producao|kwh)\b/.test(text) && /\b(disponivel|sobrou|restante)\b/.test(text)) return "energiaDisponivel";
  if (/\b(energia|geracao|producao|produziu|gerou|kwh)\b/.test(text) && /\b(acumulada|acumulado|total historico)\b/.test(text)) return "energiaTotal";
  if (/\b(quanto|quantos|qual|mostre|mostrar|consulte|consultar|me diga|me de|me da|dados)\b/.test(text) && /\b(energia|geracao|producao|produziu|gerou|kwh)\b/.test(text)) return "energiaGerada";
  return undefined;
}

export function productionMetricReply(dashboard: Record<string, unknown>, metric: ProductionMetric): string {
  const value = dashboard[metric];
  if (typeof value !== "number" || !Number.isFinite(value)) return "A consulta não retornou esse dado de produção. Não vou estimar um valor.";
  const period = typeof dashboard.competencia === "string" ? `, competência ${dashboard.competencia}` : "";
  const formatted = value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const label = metric === "ocupacao" ? "ocupação" : metric === "energiaTotal" ? "energia acumulada" : metric === "energiaDisponivel" ? "energia disponível" : "energia gerada";
  return `Na usina selecionada${metric === "energiaTotal" ? "" : period}, ${label}: ${formatted}${metric === "ocupacao" ? "%" : " kWh"}. Dado consultado no aplicativo agora.`;
}
