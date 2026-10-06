import api from "../config/api";
import { isPreviewEnvironment } from "../config/environment";
import { IS_GERADOR_APP } from "../config/appVariant";

// Legacy topic-only support for older Preview installers.
// Authorized conversation text is sanitized separately below; audio never travels here.
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

export function redactConversationText(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, "[link privado]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/R\$\s*[\d.,]+/gi, "[valor privado]")
    .replace(/\d[\d .()/+-]{6,}\d/g, "[identificador privado]").slice(0, 1200);
}

export async function answerConversationOnline(question: string, history: Array<{ from: "user" | "assistant"; text: string; private?: boolean }>): Promise<string> {
  if (!isPreviewEnvironment) throw new Error("Conversa online disponível apenas no Preview.");
  const response = await api.post<{ answer?: string }>("/assistente/responder", {
    question: redactConversationText(question),
    history: history.filter(message => !message.private).slice(-8).map(message => ({ role: message.from === "assistant" ? "model" : "user", text: redactConversationText(message.text) })),
    variant: IS_GERADOR_APP ? "gerador" : "consumidor",
  }, { timeout: 12000 });
  if (!response.data.answer) throw new Error("Gemini sem resposta.");
  return response.data.answer;
}
