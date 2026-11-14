import { contractUnitDigits } from "./assistant-contract-unit";
import { normalizeSolarRequest } from "../shared/solar-language";

type Unit = { id: string; numero?: string; cliente_id?: string; consumo_medio_kwh?: unknown; clientes?: { nome?: string } | { nome?: string }[] };

/** Resolve only rows supplied by an authenticated, plant-scoped API. */
export function selectAssistantUnits<T extends Unit>(rows: T[], question: string, context: { unitId?: string; clientId?: string } = {}) {
  const text = normalizeSolarRequest(question).replace(/[?!,;]+/g, " ").trim();
  const digits = contractUnitDigits(text);
  if (digits) return rows.filter(row => String(row.numero ?? "").replace(/\D/g, "").endsWith(digits));
  const requested = text.match(/\b(?:cliente|consumidor(?:a)?)\s+(.+?)(?:\s+(?:e depois|depois|em seguida)\b|$)/)?.[1]?.trim();
  const nameOf = (row: Unit) => normalizeSolarRequest((Array.isArray(row.clientes) ? row.clientes[0]?.nome : row.clientes?.nome) ?? "");
  if (requested) return rows.filter(row => nameOf(row).includes(requested));
  const named = rows.filter(row => {
    const name = nameOf(row);
    return name && (text.includes(name) || name.split(" ").some(part => part.length >= 3 && ["do ", "da ", "de "].some(prefix => (text + " ").includes(prefix + part + " "))));
  });
  if (named.length) return named;
  if (context.unitId) return rows.filter(row => row.id === context.unitId);
  if (context.clientId) return rows.filter(row => row.cliente_id === context.clientId);
  return [];
}

export function averageConsumptionReply(rows: Unit[]) {
  if (!rows.length) return "Não encontrei uma UC desse cliente no acesso e na usina selecionados.";
  const clients = new Set(rows.map(row => row.cliente_id).filter(Boolean));
  if (clients.size > 1) return "Encontrei mais de um cliente com esse nome. Informe o nome completo ou o final da UC.";
  return rows.map(row => {
    const raw = row.consumo_medio_kwh;
    const value = typeof raw === "number" || typeof raw === "string" && /^\d+(?:\.\d+)?$/.test(raw.trim()) ? Number(raw) : NaN;
    const name = (Array.isArray(row.clientes) ? row.clientes[0]?.nome : row.clientes?.nome);
    return `UC ${row.numero ?? "não informada"}${name ? " · " + name : ""}\nConsumo médio mensal cadastrado: ${Number.isFinite(value) && value > 0 ? value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " kWh" : "não informado"}.`;
  }).join("\n\n") + "\nFonte: configuração da UC; este valor não é o consumo da última fatura.";
}

export function inheritAssistantUnitTarget(question: string, previous?: string) {
  const text = normalizeSolarRequest(question);
  if (!previous || contractUnitDigits(text) || /\b(?:cliente|consumidor(?:a)?)\s+\S/.test(text)) return question;
  if (!/^(?:e\s+)?(?:(?:qual|quanto)\s+(?:e\s+|foi\s+)?(?:o\s+)?)?(?:o\s+)?(?:consumo(?:\s+medio)?|media (?:mensal )?(?:de )?consumo|e-?mail|telefone|celular|whatsapp|endereco|(?:no )?mes anterior)[?!. ]*$/.test(text)) return question;
  const normalizedPrevious = normalizeSolarRequest(previous);
  const digits = contractUnitDigits(normalizedPrevious);
  if (digits) return `${question.replace(/[?!.]+$/, "")} da UC ${digits}`;
  const name = normalizedPrevious.match(/\b(?:cliente|consumidor(?:a)?)\s+(.+?)(?:\s+(?:depois|em seguida)\b|[?!;]|$)/)?.[1]?.trim();
  return name ? `${question.replace(/[?!.]+$/, "")} do cliente ${name}` : question;
}
