export function speechStatusReply(question: string, fromMicrophone: boolean): string | undefined {
  const text = question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/\b(me (ouve|ouvindo|escuta|escutando)|esta (me )?ouvindo|consegue (me )?(ouvir|escutar))\b/.test(text)) return undefined;
  return fromMicrophone
    ? "Sim, recebi sua fala e ela foi transcrita. Pode continuar: como posso ajudar?"
    : "Recebi sua mensagem escrita. Para falar comigo, ative a conversa por voz ou segure o microfone.";
}

export function assistantConnectionError(error: unknown): string {
  const failure = error as { code?: string; response?: { status?: number; data?: { code?: string } } };
  const code = failure?.response?.data?.code;
  if (failure?.response?.status === 401 || failure?.response?.status === 403) return "A sessão não foi aceita pelo servidor. Entre novamente na sua conta para usar o Gemini.";
  if (code === "GEMINI_QUOTA" || failure?.response?.status === 429) return "O limite temporário do assistente online foi atingido. Aguarde um pouco e tente novamente.";
  if (code === "GEMINI_NOT_CONFIGURED" || code === "GEMINI_CREDENTIAL") return "A configuração do Gemini no servidor precisa ser corrigida. Não é um problema com sua pergunta.";
  if (failure?.code === "ECONNABORTED" || code === "GEMINI_TIMEOUT") return "O Gemini demorou para responder. Tente novamente; sua pergunta não foi rejeitada.";
  return "Não consegui conectar ao Gemini agora. Verifique a conexão e tente novamente. Sua pergunta não foi rejeitada e não substituí a conversa pela IA local.";
}
