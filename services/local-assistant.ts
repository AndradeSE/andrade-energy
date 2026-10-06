// Base determinística offline. Não é um modelo generativo e não faz chamadas HTTP.
export type AssistantScope = { variant: "gerador" | "consumidor"; authenticated: boolean };
export type LocalReply = { text: string; route?: "/tutoriais" | "/perfil" | "/faturas" | "/faturamento" | "/contrato"; kind: "help" | "navigate" | "blocked" | "unknown" };
export type LocalTopic = "faturas" | "contrato" | "atalhos" | "offline";
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[!?.,]/g, "").trim();

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
  if (/\b(fatura|faturas|faturamento)\b/.test(text)) return { kind: "help", text: scope.variant === "gerador" ? "Abra a aba Faturamento para acessar as opções de emissão e configuração. Revise os dados antes de confirmar qualquer operação." : "Abra Faturas para consultar as cobranças disponíveis. Os dados atualizados precisam de conexão." };
  if (/\b(contrato|contratos)\b/.test(text)) return { kind: "help", text: "Abra Contrato para consultar o documento e as opções disponíveis. Leia as condições antes de confirmar qualquer aceite." };
  return { kind: "unknown", text: "Ainda não tenho uma resposta validada para isso. Posso explicar faturas, contratos, atalhos e uso offline, ou abrir tutoriais e perfil." };
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
