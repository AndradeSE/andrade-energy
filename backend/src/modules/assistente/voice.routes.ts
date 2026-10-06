import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { PUBLIC_VOICE_LINES } from "./voice-lines";
import { conversationContents } from "./conversation-text";
import { GEMINI_CONVERSATION_URL } from "./gemini-model";
import { geminiAnswer, GeminiAnswerPayload } from "./gemini-answer";
import { VoiceAnswerStore } from "./voice-answer-store";
import { hashToken } from "../../utils/token";
import { authorizedAccountSpeech } from "./account-speech";
import { groqFallback } from "./groq-fallback";
import { azureVoice } from "./azure-voice";

const PUBLIC_HELP_CONTEXT = {
  faturamento: "Na aba Faturamento, o gerador pode emitir manualmente, importar PDF e configurar o faturamento automático das UCs. A conta geradora é configurada separadamente. Cobranças exigem revisão antes de confirmar.",
  producao: "Na Home, o card Geração do mês oferece importação de produção por PDF e gerenciamento do recebimento automático da conta geradora. O PDF é associado pela UC. Isso não emite cobrança ao cliente.",
  contrato: "Em Contrato, revise titularidade, partes, documentos, endereços, vigência e minuta antes da assinatura. O assistente não assina nem cancela contratos.",
  cadastro: "Na aba Clientes, cadastre o consumidor, endereço e contato, vincule UC e usina e revise os dados antes de enviar convite. Nunca compartilhe senhas.",
  perfil: "Em Perfil, o usuário pode revisar dados pessoais, endereço e segurança. O assistente não altera esses dados automaticamente.",
  notificacoes: "O sino abre Notificações. Confirme o status no detalhe antes de assumir que uma operação terminou.",
  navegacao: "As abas e o menu permitem encontrar funções pelo nome. Acessos rápidos são personalizáveis; a posição pode mudar. Trocar ambiente, usina ou UC altera o contexto dos dados.",
  tutoriais: "Em Tutoriais, escolha um vídeo do processo. Assistir não executa cadastros, cobranças nem contratos.",
} as const;
const PUBLIC_CONSUMER_HELP_CONTEXT = {
  faturamento: "No aplicativo Consumidor, Faturas mostra cobranças da UC selecionada, valores e formas de pagamento disponíveis. A configuração de faturamento automático deve respeitar a titularidade e as opções disponíveis na conta. O consumidor não emite cobranças para outros clientes.",
  producao: "O consumidor consulta informações da usina e da energia da UC selecionada. Cadastro da usina e importação de produção são recursos do Gerador.",
  contrato: "Na aba Contrato, leia a minuta e as condições. Confira os dados e siga as opções de assinatura ou aceite disponíveis. O assistente não assina nem cancela por você.",
  cadastro: "O consumidor cria seu acesso pelo convite recebido e pode consultar suas UCs vinculadas. Cadastros e vínculos da carteira são feitos pelo gerador. Nunca compartilhe senha ou código de acesso.",
  perfil: PUBLIC_HELP_CONTEXT.perfil,
  notificacoes: PUBLIC_HELP_CONTEXT.notificacoes,
  navegacao: PUBLIC_HELP_CONTEXT.navegacao,
  tutoriais: PUBLIC_HELP_CONTEXT.tutoriais,
} as const;

// Preview conversation sends authorized, redacted text only, never microphone audio.
// Keep legacy topic requests working for older installers.
export const assistenteVoiceRouter = Router();
const cachedAudio = new Map<keyof typeof PUBLIC_VOICE_LINES, string>();
const publicAnswerAudio = new Map<string, { audio: string; expires: number }>();
let providerQuotaUntil = 0;
const voiceAnswers = new VoiceAnswerStore();
assistenteVoiceRouter.use(exigirAutenticacao);
assistenteVoiceRouter.use(rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }));

assistenteVoiceRouter.post("/responder", async (req, res) => {
  const isPreview = process.env.APP_ENV === "preview" ||
    /^https:\/\/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(process.env.SUPABASE_URL ?? "");
  if (!isPreview) return res.status(404).json({ message: "Indisponível." });
  const { topic, variant, question, history } = req.body ?? {};
  const conversation = typeof question === "string" && question.trim().length > 0 && question.length <= 1200;
  if ((variant !== "gerador" && variant !== "consumidor") || (!conversation && (typeof topic !== "string" || !Object.prototype.hasOwnProperty.call(PUBLIC_HELP_CONTEXT, topic)))) {
    return res.status(400).json({ message: "Assunto inválido." });
  }
  if (conversation && history !== undefined && (!Array.isArray(history) || history.length > 8 || history.some((turn: any) => !turn || !["user", "model"].includes(turn.role) || typeof turn.text !== "string" || turn.text.length > 1200))) {
    return res.status(400).json({ message: "Histórico inválido." });
  }
  const key = (process.env.GEMINI_ASSISTANT_API_KEY || process.env.GEMINI_TTS_API_KEY)?.trim();
  const contexts = variant === "consumidor" ? PUBLIC_CONSUMER_HELP_CONTEXT : PUBLIC_HELP_CONTEXT;
  const context = conversation ? Object.values(contexts).join("\n") : contexts[topic as keyof typeof PUBLIC_HELP_CONTEXT];
  const fallback = async () => {
    const answer = await groqFallback(`Você é o assistente cordial do Andrade Energy ${variant}. Responda em português brasileiro, até 90 palavras. Não invente dados, valores, status ou ações. Não execute operações. Não tem acesso à conta. Se houver ambiguidade, pergunte. Recursos verificados: ${context}`, conversation ? question : `Explique este recurso: ${context}`, conversation ? history ?? [] : []);
    if (!answer) return false;
    res.setHeader("Cache-Control", "no-store");
    console.info("Groq fallback answered");
    res.json({ answer, provider: "groq", voiceAnswerId: voiceAnswers.put(hashToken(req.headers.authorization ?? ""), answer) });
    return true;
  };
  if (!key && await fallback()) return;
  if (!key) return res.status(503).json({ code: "GEMINI_NOT_CONFIGURED", message: "Assistente online não configurado." });
  try {
    const response = await fetch(GEMINI_CONVERSATION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: conversation ? conversationContents(question, history ?? []) : [{ role: "user", parts: [{ text: `Explique de modo breve e cordial este recurso do aplicativo Andrade Energy ${variant}: ${context}` }] }],
        systemInstruction: { parts: [{ text: `Você é o assistente cordial do Andrade Energy ${variant}. Converse em português brasileiro, respondendo à pergunta atual no contexto do histórico, sem repetir orientações já dadas. Entenda erros de escrita; se houver ambiguidade, pergunte. Até 90 palavras. Não invente valores, status, botões ou ações executadas. Não tem acesso aos dados privados da conta; consultas são feitas separadamente pelo aplicativo. Não peça senhas nem documentos. Use estes recursos verificados como referência, e explique quando não souber: ${context}` }] },
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024, thinkingConfig: { thinkingLevel: "minimal" } },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn("Gemini conversation unavailable, provider status:", response.status);
      if ((response.status === 429 || response.status >= 500) && await fallback()) return;
      const code = response.status === 429 ? "GEMINI_QUOTA" : [400, 401, 403].includes(response.status) ? "GEMINI_CREDENTIAL" : "GEMINI_UNAVAILABLE";
      return res.status(503).json({ code, message: "Assistente online indisponível." });
    }
    const payload = await response.json() as GeminiAnswerPayload;
    const answer = geminiAnswer(payload);
    if (!answer) {
      const finishReason = payload.candidates?.[0]?.finishReason;
      console.warn("Gemini conversation empty response, finish:", typeof finishReason === "string" && /^[A-Z_]{1,40}$/.test(finishReason) ? finishReason : "UNKNOWN");
      return res.status(503).json({ code: "GEMINI_EMPTY_RESPONSE", message: "Resposta indisponível." });
    }
    console.info("Gemini conversation answered");
    res.setHeader("Cache-Control", "no-store");
    const owner = hashToken(req.headers.authorization ?? "");
    return res.json({ answer, voiceAnswerId: voiceAnswers.put(owner, answer) });
  } catch (error) {
    const code = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "GEMINI_TIMEOUT" : "GEMINI_UNAVAILABLE";
    console.warn("Gemini conversation failed:", code);
    if (await fallback()) return;
    return res.status(503).json({ code, message: "Assistente online indisponível." });
  }
});

assistenteVoiceRouter.post("/voz", async (req, res) => {
  const isPreview = process.env.APP_ENV === "preview" ||
    /^https:\/\/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(process.env.SUPABASE_URL ?? "");
  if (!isPreview) return res.status(404).json({ message: "Indisponível." });

  const lineId = req.body?.lineId;
  const answerId = req.body?.answerId;
  const answerText = typeof answerId === "string" ? voiceAnswers.get(hashToken(req.headers.authorization ?? ""), answerId) : undefined;
  const fixedLine = typeof lineId === "string" && Object.prototype.hasOwnProperty.call(PUBLIC_VOICE_LINES, lineId);
  const accountSpeech = authorizedAccountSpeech(req.body ?? {});
  if ([Boolean(fixedLine), Boolean(answerText), Boolean(accountSpeech)].filter(Boolean).length !== 1) {
    return res.status(400).json({ message: "Frase não permitida." });
  }
  const key = process.env.GEMINI_TTS_API_KEY?.trim();
  const speechText = accountSpeech ?? answerText ?? PUBLIC_VOICE_LINES[lineId as keyof typeof PUBLIC_VOICE_LINES];
  const fallbackVoice = async () => {
    // Old installers consented to Google only; do not silently widen recipients.
    if (accountSpeech && req.body?.azureVoiceConsent !== true) return false;
    const audio = await azureVoice(speechText);
    if (!audio) return false;
    console.info("Azure natural audio delivered:", accountSpeech ? "account-consented" : "public");
    res.setHeader("Cache-Control", "no-store");
    res.json({ audio, mimeType: "audio/wav", provider: "azure" });
    return true;
  };
  if (!key && await fallbackVoice()) return;
  if (!key) return res.status(503).json({ message: "Voz online não configurada." });
  const cached = fixedLine ? cachedAudio.get(lineId as keyof typeof PUBLIC_VOICE_LINES) : undefined;
  if (cached) return res.json({ audio: cached, mimeType: "audio/wav" });
  const publicAudioKey = !accountSpeech && answerText ? hashToken(answerText) : undefined;
  const publicCached = publicAudioKey ? publicAnswerAudio.get(publicAudioKey) : undefined;
  if (publicCached && publicCached.expires > Date.now()) return res.json({ audio: publicCached.audio, mimeType: "audio/wav" });
  if (providerQuotaUntil > Date.now()) {
    if (await fallbackVoice()) return;
    res.setHeader("Retry-After", String(Math.ceil((providerQuotaUntil - Date.now()) / 1000)));
    return res.status(429).json({ code: "TTS_QUOTA", message: "Limite temporário da voz natural." });
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model: "gemini-3.8-flash-lite-tts",
        input: [{ type: "user_input", content: [{ type: "text", text: accountSpeech ?? answerText ?? PUBLIC_VOICE_LINES[lineId as keyof typeof PUBLIC_VOICE_LINES], annotations: [{ type: "speech_metadata", style: "Voz brasileira natural, cordial e clara." }] }] }],
        response_format: { type: "audio", mime_type: "audio/wav" },
        generation_config: { speech_config: [{ voice: "Kore" }] },
      }),
      signal: AbortSignal.timeout(process.env.AZURE_SPEECH_KEY ? 7000 : 14_000),
    });
    if (!response.ok) {
      console.warn("Assistente TTS indisponível, status:", response.status);
      if (response.status === 429) providerQuotaUntil = Date.now() + 60_000;
      if (await fallbackVoice()) return;
      return res.status(response.status === 429 ? 429 : 503).json({ code: response.status === 429 ? "TTS_QUOTA" : "TTS_UNAVAILABLE", message: "Voz online indisponível." });
    }
    const payload = await response.json() as { output_audio?: { data?: string }; steps?: Array<{ type?: string; content?: Array<{ type?: string; data?: string }> }> };
    const audio = payload.output_audio?.data ?? payload.steps?.flatMap(step => step.content ?? []).reverse().find(content => content.type === "audio")?.data;
    if (!audio || audio.length > (fixedLine ? 2_000_000 : 8_000_000)) {
      if (await fallbackVoice()) return;
      return res.status(503).json({ message: "Áudio indisponível." });
    }
    if (fixedLine) cachedAudio.set(lineId as keyof typeof PUBLIC_VOICE_LINES, audio);
    if (publicAudioKey) {
      for (const [id, entry] of publicAnswerAudio) if (entry.expires <= Date.now()) publicAnswerAudio.delete(id);
      if (publicAnswerAudio.size >= 4) publicAnswerAudio.delete(publicAnswerAudio.keys().next().value!);
      publicAnswerAudio.set(publicAudioKey, { audio, expires: Date.now() + 600_000 });
    }
    console.info("Assistente natural audio delivered:", accountSpeech ? "account-consented" : "public");
    res.setHeader("Cache-Control", "no-store");
    return res.json({ audio, mimeType: "audio/wav" });
  } catch {
    if (await fallbackVoice()) return;
    return res.status(503).json({ message: "Voz online indisponível." });
  }
});
