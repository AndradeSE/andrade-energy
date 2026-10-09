export function redactConversationText(text: string): string {
  return text.replace(/https?:\/\/\S+/gi, "[link privado]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/R\$\s*[\d.,]+/gi, "[valor privado]")
    .replace(/\d[\d .()/+-]{6,}\d/g, "[identificador privado]");
}

export function conversationContents(question: string, history: Array<{ role: string; text: string }>) {
  return [...history.map(turn => ({ role: turn.role, parts: [{ text: redactConversationText(turn.text) }] })),
    { role: "user", parts: [{ text: redactConversationText(question) }] }];
}
