// Base determinística offline. Não é um modelo generativo e não faz chamadas HTTP.
import { guideAppAnswer } from "./assistant-app-guide";
export type AssistantScope = { variant: "gerador" | "consumidor"; authenticated: boolean };
export type LocalReply = { text: string; route?: "/tutoriais" | "/perfil" | "/faturas" | "/faturamento" | "/contrato"; kind: "help" | "navigate" | "blocked" | "unknown" };
export type LocalTopic = "faturas" | "contrato" | "atalhos" | "offline";
export const VERIFIED_APP_CONTEXT = [
  "No Gerador, a aba Faturamento oferece faturamento manual, por PDF e automático das UCs.",
  "O recebimento automático da conta geradora fica no card Geração do mês da Home; atualiza produção e não cria cobrança ao cliente.",
  "Produção da usina também pode ser informada por PDF na Home e na lista de usinas.",
  "O Gerador consulta faturas na aba Faturamento e contratos na aba Contrato.",
  "O Consumidor consulta faturas e contrato nas respectivas abas; assinatura ou aceite exige revisão da pessoa.",
  "Acessos rápidos são personalizáveis; indique sempre o nome da aba ou função, nunca a posição do atalho.",
  "Dados e valores atuais só podem ser informados após consulta autenticada; nunca estime valores.",
].join(" ");
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[!?.,]/g, "").trim();
const appTerms = ["fatura", "faturas", "faturamento", "automatico", "automatica", "usina", "producao", "cliente", "clientes", "contrato", "contratos", "perfil", "financeiro", "tutorial", "tutoriais", "cobranca", "cobrancas", "ultima", "ultimo", "valor", "pdf"];
function oneEditApart(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    let differences = 0;
    for (let i = 0; i < a.length; i++) differences += Number(a[i] !== b[i]);
    return differences === 1;
  }
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  for (let i = 0; i < longer.length; i++) if (longer.slice(0, i) + longer.slice(i + 1) === shorter) return true;
  return false;
}
export function normalizeAssistantQuery(input: string) {
  return normalize(input).replace(/\b[a-z]{5,}\b/g, word => {
    if (appTerms.includes(word)) return word;
    const candidates = appTerms.filter(term => oneEditApart(word, term));
    return candidates.length === 1 ? candidates[0] : word;
  });
}

export function shouldUseConversationalModel(kind: LocalReply["kind"], voiceMode: boolean, modelReady: boolean, wordCount: number) {
  return modelReady && wordCount > 2 && (kind === "unknown" || (voiceMode && kind === "help"));
}

export function asksLatestInvoiceAmount(input: string) {
  const text = normalizeAssistantQuery(input);
  return /\b(fatura|cobranca)\b/.test(text)
    && /\b(ultima|ultimo|mais recente)\b/.test(text)
    && /\b(valor|quanto|total|foi|deu)\b/.test(text);
}

export function answerLocally(input: string, scope: AssistantScope): LocalReply {
  const text = normalizeAssistantQuery(input);
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
  if (scope.variant === "gerador" && /\b(automatico|automatica)\b/.test(text) && /\b(usina|producao)\b/.test(text)) return { kind: "help", text: "No card Geração do mês da Home, abra Gerenciar recebimento de dados automático para a conta geradora. Isso atualiza a produção, sem criar cobrança ao cliente. O faturamento automático das UCs continua separado na aba Faturamento." };
  if (/\b(automatico|automatica)\b/.test(text) && /\b(fatura|faturamento|recebimento)\b/.test(text)) return { kind: "help", text: "Na aba Faturamento, abra Faturamento automático para configurar o recebimento das contas das UCs por e-mail. Para dados da usina, use Gerenciar recebimento de dados automático no card Geração do mês da Home." };
  if (/\b(fatura|faturas|faturamento)\b/.test(text)) return { kind: "help", text: scope.variant === "gerador" ? "Abra a aba Faturamento para acessar as opções de emissão e configuração. Revise os dados antes de confirmar qualquer operação." : "Abra Faturas para consultar as cobranças disponíveis. Os dados atualizados precisam de conexão." };
  if (/\b(contrato|contratos)\b/.test(text)) return { kind: "help", text: "Abra Contrato para consultar o documento e as opções disponíveis. Leia as condições antes de confirmar qualquer aceite." };
  return { kind: "unknown", text: "Desculpe, não entendi bem sua pergunta. Você pode reformular ou dizer se é sobre faturas, usina, contrato ou outra função do app?" };
}

// Retém apenas o assunto da última resposta, sem guardar texto pessoal no aparelho.
export function answerInConversation(input: string, scope: AssistantScope, previousTopic?: LocalTopic): { reply: LocalReply; topic?: LocalTopic } {
  const normalized = normalizeAssistantQuery(input);
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
