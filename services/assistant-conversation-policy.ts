import { conversationMemory } from "./assistant-conversation-memory";
export type ConversationTurn = { from: "user" | "assistant"; text: string; private?: boolean };

// Os dois modos chegam aqui somente depois das ferramentas autenticadas.
// A geração de texto nunca retorna comandos executáveis, URLs ou permissões.
export async function answerAssistantConversation(input: {
  mode: "online" | "local"; modelReady: boolean; question: string;
  history: ConversationTurn[]; help?: string; context: string;
}, io: {
  online: (question: string, history: ConversationTurn[]) => Promise<{ text: string; voiceAnswerId?: string }>;
  local: (turns: Array<{ role: "user" | "assistant"; content: string }>, context: string) => Promise<string>;
}): Promise<{ text: string; voiceAnswerId?: string; private?: boolean }> {
  const history = conversationMemory(input.history, input.mode);
  if (input.mode === "online") return io.online(input.question, history);
  if (input.help) return { text: input.help, private: true };
  if (!input.modelReady) return { text: "Instale o modelo em Configurações da Solar para conversar no aparelho. As consultas e os comandos seguros continuam disponíveis; dados atuais precisam de internet.", private: true };
  try {
    const text = await io.local([...history.map(turn => ({ role: turn.from, content: turn.text })), { role: "user", content: input.question }], input.context);
    return { text, private: true };
  } catch {
    return { text: "O modelo local não conseguiu responder. As consultas e os comandos seguros continuam disponíveis. Você pode tentar novamente ou escolher o modo online em Configurações da Solar. Não enviei esta conversa à IA online.", private: true };
  }
}
