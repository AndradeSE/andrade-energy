import { contractUnitDigits } from "./assistant-contract-unit";
import { normalizeSolarRequest } from "../shared/solar-language";

type Unit = { id: string; numero?: string; cliente_id?: string; consumo_medio_kwh?: unknown; clientes?: { nome?: string } | { nome?: string }[] };

export function selectAssistantClients<T extends { nome?: string }>(rows: T[], question: string): T[] {
  const text = normalizeSolarRequest(question);
  const requested = text.match(/\b(?:cliente|consumidor(?:a)?)\s+(.+?)(?:[?!,;]|\s+(?:e depois|depois|em seguida|e (?:abra|consulte|mostre))\b|$)/)?.[1]
    ?.replace(/\s+(?:no mes anterior|na competencia\b|em (?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|\d)).*$/, "")
    .replace(/[.]+$/, "").trim();
  if (requested) {
    const exact = rows.filter(row => normalizeSolarRequest(row.nome ?? "") === requested);
    return exact.length ? exact : rows.filter(row => normalizeSolarRequest(row.nome ?? "").includes(requested));
  }
  const full = rows.filter(row => row.nome && text.includes(normalizeSolarRequest(row.nome)));
  if (full.length) {
    const longest = Math.max(...full.map(row => normalizeSolarRequest(row.nome!).length));
    return full.filter(row => normalizeSolarRequest(row.nome!).length === longest);
  }
  return rows.filter(row => normalizeSolarRequest(row.nome ?? "").split(" ").some(part => part.length >= 3 && ["cliente ", "do ", "da ", "de "].some(prefix => (text + " ").includes(prefix + part + " "))));
}

/** Resolve only rows supplied by an authenticated, plant-scoped API. */
export function selectAssistantUnits<T extends Unit>(rows: T[], question: string, context: { unitId?: string; clientId?: string } = {}) {
  const text = normalizeSolarRequest(question).replace(/[?!,;]+/g, " ").trim();
  const digits = contractUnitDigits(text);
  if (digits) return rows.filter(row => String(row.numero ?? "").replace(/\D/g, "").endsWith(digits));
  const requested = text.match(/\b(?:cliente|consumidor(?:a)?)\s+(.+?)(?:\s+(?:e depois|depois|em seguida)\b|$)/)?.[1]?.trim();
  const nameOf = (row: Unit) => normalizeSolarRequest((Array.isArray(row.clientes) ? row.clientes[0]?.nome : row.clientes?.nome) ?? "");
  if (requested) {
    const exact = rows.filter(row => nameOf(row) === requested.replace(/[.]+$/, ""));
    return exact.length ? exact : rows.filter(row => nameOf(row).includes(requested));
  }
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
  const followUp = text.replace(/\s+(?:dessa|desta|da mesma)\s+(?:uc|unidade(?: consumidora)?)(?=[?!. ]*$)/, "");
  if (!/^(?:e\s+)?(?:(?:qual|quanto)\s+(?:e\s+|foi\s+)?(?:o\s+)?)?(?:o\s+)?(?:consumo(?:\s+medio)?|media (?:mensal )?(?:de )?consumo|e-?mail|telefone|celular|whatsapp|endereco|(?:no )?mes anterior)[?!. ]*$/.test(followUp)) return question;
  const normalizedPrevious = normalizeSolarRequest(previous);
  const digits = contractUnitDigits(normalizedPrevious);
  if (digits) return `${question.replace(/\s+(?:dessa|desta|da mesma)\s+(?:uc|unidade(?: consumidora)?)[?!. ]*$/i, "").replace(/[?!.]+$/, "")} da UC ${digits}`;
  const name = normalizedPrevious.match(/\b(?:cliente|consumidor(?:a)?)\s+(.+?)(?:\s+(?:depois|em seguida)\b|[?!;]|$)/)?.[1]?.trim();
  return name ? `${question.replace(/[?!.]+$/, "")} do cliente ${name}` : question;
}
