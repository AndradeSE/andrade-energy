import { hasSolarMutation, isSolarHelp, normalizeSolarRequest } from "../shared/solar-language";

const fields = [
  { key: "distribuidora", label: "Concessionária", match: /\b(concessionaria|distribuidora)\b/ },
  { key: "titular", label: "Titular da fatura", match: /\b(titular|titularidade)\b/ },
  { key: "endereco", label: "Endereço da UC", match: /\b(endereco|cep|bairro|cidade)\b/ },
  { key: "apelido", label: "Apelido", match: /\bapelido\b/ },
  { key: "numero", label: "Número da UC", match: /\b(numero|identificacao)\b/ },
  { key: "status", label: "Situação da UC", match: /\b(status|situacao|ativa|inativa)\b/ },
  { key: "zona_localizacao", label: "Localização", match: /\b(rural|urbana|zona|localizacao)\b/ },
  { key: "modalidade_faturamento", label: "Modalidade", match: /\b(modalidade|compensacao|injecao)\b/ },
  { key: "desconto_percentual", label: "Desconto cadastrado", match: /\b(desconto|percentual de desconto)\b/, unit: "%" },
  { key: "percentual_rateio", label: "Rateio cadastrado", match: /\b(rateio|alocacao)\b/, unit: "%" },
  { key: "consumo_medio_kwh", label: "Consumo médio cadastrado", match: /\b(consumo medio|media (?:mensal )?(?:de )?consumo)\b/, unit: " kWh" },
] as const;
export type UnitDetailKey = typeof fields[number]["key"];

/** Reads configuration fields only. Invoice, document and mutation requests keep their own flows. */
export function requestedUnitDetails(question: string): UnitDetailKey[] {
  const text = normalizeSolarRequest(question).replace(/\btitular (?:da|de) fatura\b/g, "titular");
  if (hasSolarMutation(text) || isSolarHelp(text) || /\b(pdf|arquivo|documento|boleto|pagamento|contrato|economia|simulacao|calcule|fatura)\b/.test(text)) return [];
  const targetsUnit = /\b(uc|ucs|unidade|unidades)\b/.test(text);
  if (/\b(cliente|consumidor)\b/.test(text) && !targetsUnit) return [];
  if (/\b(usina|geradora)\b/.test(text) && !targetsUnit) return [];
  if (targetsUnit && /\b(dados|informacoes|cadastro|detalhes)\b/.test(text)) return fields.map(field => field.key);
  if (!/\b(qual|quem|onde|informe|diga|saber|consulte|consultar|pertence|atende|esta|e)\b/.test(text)) return [];
  return fields.filter(field => field.match.test(text) && (field.key !== "percentual_rateio" || targetsUnit)).map(field => field.key);
}

export function unitDetailsReply(unit: Record<string, unknown>, keys: UnitDetailKey[]) {
  const value = (key: UnitDetailKey, suffix?: string) => {
    const raw = unit[key];
    if (suffix) {
      const numeric = typeof raw === "number" || typeof raw === "string" && /^\d+(?:\.\d+)?$/.test(raw.trim()) ? Number(raw) : NaN;
      return Number.isFinite(numeric) ? numeric.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) + suffix : "não informado";
    }
    return typeof raw === "string" && raw.trim() ? raw.trim() : "não informado";
  };
  return `UC ${value("numero")}\n` + fields.filter(field => keys.includes(field.key)).map(field =>
    `${field.label}: ${value(field.key, "unit" in field ? field.unit : undefined)}.`).join("\n") + "\nFonte: cadastro da unidade; valores cadastrados não substituem os dados da última fatura.";
}
