import { guideAppAnswer } from "../../services/assistant-app-guide.ts";

export function contractGuidance(question: string, variant: "CONSUMIDOR" | "GERADOR") {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const audience = variant === "GERADOR" ? "gerador" : "consumidor";
  if (/(lembrete|aviso|notificac).*(fatura|cobranca)|(fatura|cobranca).*(lembrete|aviso|notificac)/.test(text)) {
    return guideAppAnswer("fatura vencimento", audience);
  }
  if (/fidelidade|desligamento|aviso previo|renovar|renovacao|contrato.*vencimento|vencimento.*contrato/.test(text)) {
    return guideAppAnswer("fidelidade", audience);
  }
  return undefined;
}
