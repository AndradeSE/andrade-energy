import { simularEconomia } from "../utils/simulacao-economia";

type Calculation = { conta: number; energia: number; desconto: number };
export type AssistantEconomyReply = { text: string; complete: boolean };

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function numberFrom(value?: string) {
  if (!value) return undefined;
  const normalized = value.trim().replace(/\s/g, "").replace(/^r\$/i, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  const integer = decimalIndex >= 0 ? normalized.slice(0, decimalIndex).replace(/[^\d]/g, "") : normalized.replace(/[^\d]/g, "");
  const fraction = decimalIndex >= 0 ? normalized.slice(decimalIndex + 1).replace(/[^\d]/g, "") : "";
  const parsed = Number(`${integer || "0"}${fraction ? `.${fraction}` : ""}`);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function capture(text: string, labels: RegExp[]) {
  for (const label of labels) {
    const match = text.match(label);
    const value = numberFrom(match?.[1]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function values(question: string): Partial<Calculation> {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Values are terminated by whitespace or punctuation in the spoken/text
  // command. Keeping the capture compact avoids swallowing “e desconto”.
  const amount = "(?:r\\$\\s*)?([0-9][0-9.,]*)";
  return {
    conta: capture(text, [new RegExp(`(?:valor\\s+(?:atual\\s+)?da\\s+)?(?:conta|fatura)(?:\\s+atual)?\\s*(?:e|é|de|=|:|por)?\\s*${amount}`, "i")]),
    energia: capture(text, [new RegExp(`(?:parcela\\s+(?:de\\s+)?energia(?:\\s+elegivel)?|energia(?:\\s+(?:elegivel|compensada))?|base(?:\\s+de\\s+desconto)?)\\s*(?:e|é|de|=|:|por)?\\s*${amount}`, "i")]),
    desconto: capture(text, [new RegExp(`(?:desconto(?:\\s+da\\s+proposta)?|percentual)\\s*(?:e|é|de|=|:|por)?\\s*${amount}\\s*%?`, "i")]),
  };
}

export function asksEconomyCalculation(question: string) {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(calcul[ae]|simul[ae]|quanto(?:\s+(?:eu|o cliente))?\s+(?:vai )?economiz|estim[ae])\b/.test(text)
    && /\b(economia|desconto|conta|fatura|energia)\b/.test(text);
}

export function answerEconomyCalculation(question: string): AssistantEconomyReply | undefined {
  if (!asksEconomyCalculation(question)) return undefined;
  const parsed = values(question);
  const missing = [
    !parsed.conta && "valor atual da conta",
    parsed.energia === undefined && "parcela de energia elegível",
    parsed.desconto === undefined && "desconto da proposta",
  ].filter(Boolean) as string[];
  if (missing.length) return {
    complete: false,
    text: `Consigo calcular aqui mesmo. Para uma estimativa segura, informe ${missing.join(", ")}. Exemplo: “conta R$ 1.000, energia R$ 800 e desconto 20%”. Não vou abrir a calculadora nem criar cobrança.`,
  };
  try {
    const result = simularEconomia(parsed.conta!, parsed.energia!, parsed.desconto!);
    return {
      complete: true,
      text: `Estimativa de economia\nConta atual: ${money(result.contaAtual)}\nEnergia Andrade após desconto: ${money(result.energiaComDesconto)}\nTotal estimado com Andrade: ${money(result.totalEstimado)}\nEconomia mensal: ${money(result.economiaMensal)} (${percent(result.descontoEfetivo)}% da conta)\nEconomia em 12 meses: ${money(result.economiaAnual)}.\nÉ uma simulação: tarifas, impostos, bandeira, iluminação pública e consumo real podem mudar o resultado.`,
    };
  } catch (error) {
    return { complete: false, text: error instanceof Error ? error.message : "Não consegui calcular essa estimativa." };
  }
}
