// Base determinística offline. Não é um modelo generativo e não faz chamadas HTTP.
import { guideAppAnswer } from "./assistant-app-guide";
export type AssistantScope = { variant: "gerador" | "consumidor"; authenticated: boolean };
export type LocalReply = { text: string; route?: "/tutoriais" | "/perfil" | "/faturas" | "/faturamento" | "/contrato"; kind: "help" | "navigate" | "blocked" | "unknown" };
export type LocalTopic = "faturas" | "contrato" | "atalhos" | "offline";
export const VERIFIED_APP_CONTEXT = [
  "No Gerador, Faturamento oferece fatura manual, fatura automática das UCs e fatura automática da usina.",
  "A fatura automática da usina recebe a conta geradora para atualizar produção; não cria cobrança ao cliente.",
  "Produção da usina também pode ser informada por PDF na Home e na lista de usinas.",
  "O Gerador consulta faturas na aba Faturamento e contratos na aba Contrato.",
  "O Consumidor consulta faturas e contrato nas respectivas abas; assinatura ou aceite exige revisão da pessoa.",
  "Acessos rápidos são personalizáveis; indique sempre o nome da aba ou função, nunca a posição do atalho.",
  "Dados e valores atuais só podem ser informados após consulta autenticada; nunca estime valores.",
].join(" ");
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[!?.,]/g, "").trim();

export function asksLatestInvoiceAmount(input: string) {
  const text = normalize(input);
  return /\b(fatura|cobranca)\b/.test(text)
    && /\b(ultima|ultimo|mais recente)\b/.test(text)
    && /\b(valor|quanto|total|foi|deu)\b/.test(text);
}

export function answerLocally(input: string, scope: AssistantScope): LocalReply {
  const text = normalize(input);
  if (input.length > 1000) return { kind: "unknown", text: "Use uma pergunta ou comando curto." };
  if (!scope.authenticated) return { kind: "blocked", text: "Entre na sua conta para usar o assistente." };
  const perguntaInformativa = /^(como|onde|o que|qual|quais|quando|por que|porque|me explique|explique)\b/.test(text);
  if (!perguntaInformativa && /\b(excluir|apagar|transferir|pagar|assinar|cancelar|enviar|faturar|gerar)\b/.test(text)) {
    return { kind: "blocked", text: "Não executo essa operação automaticamente. Abra a seção correspondente e revise a confirmação no aplicativo." };
  }
  const routes: Record<string, LocalReply["route"]> = { tutoriais: "/tutoriais", perfil: "/perfil", faturas: "/faturas", contrato: "/contrato" };
  if (scope.variant === "gerador") routes.faturamento = "/faturamento";
  const command = text.match(/^(?:abrir|abra|mostrar|mostre|ir para|quero abrir) (?:a |o |os |as )?(.+)$/);
  if (command && routes[command[1]]) return { kind: "navigate", route: routes[command[1]], text: `Abrir ${command[1]}.` };
  if (/\b(atalho|atalhos|acesso rapido)\b/.test(text)) return { kind: "help", text: "Os acessos rápidos são personalizáveis. Procure pelo nome da função, não pela posição. As abas oferecem caminhos fixos." };
  if (/\b(offline|internet)\b/.test(text)) return { kind: "help", text: "Esta ajuda funciona localmente. Consultar dados atualizados, faturar e enviar documentos depende de internet." };
  const guided = guideAppAnswer(text, scope.variant);
  if (guided) return { kind: "help", text: guided };
  if (scope.variant === "gerador" && /\b(producao|usina)\b/.test(text) && /\b(pdf|importar|informar|conta)\b/.test(text)) return { kind: "help", text: "Para informar a produção da usina por PDF, use o botão no card Geração do mês da Home ou na lista de usinas. A conta é associada pela UC identificada no documento." };
  if (scope.variant === "gerador" && /\b(automatico|automatica)\b/.test(text) && /\b(usina|producao)\b/.test(text)) return { kind: "help", text: "A opção Fatura automática da usina fica em Faturamento. Ela recebe a conta geradora para atualizar os dados de produção, sem criar cobrança ao cliente. É separada da fatura automática das UCs." };
  if (/\b(automatico|automatica)\b/.test(text) && /\b(fatura|faturamento|recebimento)\b/.test(text)) return { kind: "help", text: "Em Faturamento, abra Fatura automática para configurar o recebimento das contas das UCs por e-mail. O recebimento da conta geradora usa a opção separada Fatura automática da usina." };
  if (/\b(fatura|faturas|faturamento)\b/.test(text)) return { kind: "help", text: scope.variant === "gerador" ? "Abra a aba Faturamento para acessar as opções de emissão e configuração. Revise os dados antes de confirmar qualquer operação." : "Abra Faturas para consultar as cobranças disponíveis. Os dados atualizados precisam de conexão." };
  if (/\b(contrato|contratos)\b/.test(text)) return { kind: "help", text: "Abra Contrato para consultar o documento e as opções disponíveis. Leia as condições antes de confirmar qualquer aceite." };
  return { kind: "unknown", text: "Desculpe, ainda não tenho uma resposta verificada para essa pergunta. Posso orientar sobre cadastro, usinas, UCs, faturamento, contratos, operação, financeiro e perfil; para valores atuais, consulto apenas os dados autorizados da sua conta." };
}

// Retém apenas o assunto da última resposta, sem guardar texto pessoal no aparelho.
export function answerInConversation(input: string, scope: AssistantScope, previousTopic?: LocalTopic): { reply: LocalReply; topic?: LocalTopic } {
  const normalized = normalize(input);
  const followUp = /^(e (como|onde|isso|depois)|como faco|onde fica|me explica|pode explicar|e no meu caso)/.test(normalized);
  const contextualInput = followUp && previousTopic ? `${input} ${previousTopic}` : input;
  const reply = answerLocally(contextualInput, scope);
  const topic: LocalTopic | undefined = /\b(fatura|faturas|faturamento)\b/.test(normalized) ? "faturas"
    : /\b(contrato|contratos)\b/.test(normalized) ? "contrato"
    : /\b(atalho|atalhos|acesso rapido)\b/.test(normalized) ? "atalhos"
    : /\b(offline|internet)\b/.test(normalized) ? "offline"
    : followUp ? previousTopic : undefined;
  return { reply, topic };
}
