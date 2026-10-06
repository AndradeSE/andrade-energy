import api from "../config/api";
import { isPreviewEnvironment } from "../config/environment";
import { IS_GERADOR_APP } from "../config/appVariant";

// Only these public app topics cross the network. Never send the question,
// transcript, conversation history, account identifiers or financial values.
export type PublicHelpTopic = "faturamento" | "producao" | "contrato" | "cadastro" | "perfil" | "notificacoes" | "navegacao" | "tutoriais";

export function publicHelpTopic(question: string): PublicHelpTopic | undefined {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(fatura|faturamento|cobranca|boleto)\b/.test(text)) return "faturamento";
  if (/\b(usina|producao|geracao|inversor)\b/.test(text)) return "producao";
  if (/\b(contrato|minuta|locador|assinatura)\b/.test(text)) return "contrato";
  if (/\b(cadastro|cadastrar|cliente|consumidor|convite|uc)\b/.test(text)) return "cadastro";
  if (/\b(perfil|endereco|senha)\b/.test(text)) return "perfil";
  if (/\b(notificacao|alerta|aviso)\b/.test(text)) return "notificacoes";
  if (/\b(menu|aba|navegar|trocar|ambiente|atalho)\b/.test(text)) return "navegacao";
  if (/\b(tutorial|video|ajuda)\b/.test(text)) return "tutoriais";
  return undefined;
}

export async function answerPublicHelpOnline(topic: PublicHelpTopic): Promise<string | undefined> {
  if (!isPreviewEnvironment) return undefined;
  try {
    const response = await api.post<{ answer?: string }>("/assistente/responder", { topic, variant: IS_GERADOR_APP ? "gerador" : "consumidor" }, { timeout: 6500 });
    return typeof response.data.answer === "string" && response.data.answer.length <= 800 ? response.data.answer : undefined;
  } catch {
    return undefined;
  }
}
