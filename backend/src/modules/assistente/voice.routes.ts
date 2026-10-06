import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { PUBLIC_VOICE_LINES } from "./voice-lines";

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

// A camada gratuita do Gemini não deve receber falas, nomes ou dados da conta.
// O cliente envia somente um identificador; o texto é fixo e auditável aqui.

export const assistenteVoiceRouter = Router();
const cachedAudio = new Map<keyof typeof PUBLIC_VOICE_LINES, string>();
assistenteVoiceRouter.use(exigirAutenticacao);
assistenteVoiceRouter.use(rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }));

assistenteVoiceRouter.post("/responder", async (req, res) => {
  const isPreview = process.env.APP_ENV === "preview" ||
    /^https:\/\/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(process.env.SUPABASE_URL ?? "");
  if (!isPreview) return res.status(404).json({ message: "Indisponível." });
  const { topic, variant } = req.body ?? {};
  if ((variant !== "gerador" && variant !== "consumidor") || typeof topic !== "string" || !Object.prototype.hasOwnProperty.call(PUBLIC_HELP_CONTEXT, topic)) {
    return res.status(400).json({ message: "Assunto inválido." });
  }
  const key = (process.env.GEMINI_ASSISTANT_API_KEY || process.env.GEMINI_TTS_API_KEY)?.trim();
  if (!key) return res.status(503).json({ message: "Assistente online não configurado." });
  try {
    const context = (variant === "consumidor" ? PUBLIC_CONSUMER_HELP_CONTEXT : PUBLIC_HELP_CONTEXT)[topic as keyof typeof PUBLIC_HELP_CONTEXT];
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `Explique de modo breve e cordial este recurso do aplicativo Andrade Energy ${variant}: ${context}` }] }],
        systemInstruction: { parts: [{ text: "Responda somente em português do Brasil, com até 90 palavras. Use apenas o contexto fornecido. Não invente valores, status, botões ou ações. Não peça dados pessoais. Se faltar detalhe, indique a tela correspondente." }] },
        generationConfig: { temperature: 0.2, maxOutputTokens: 220 },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return res.status(503).json({ message: "Assistente online indisponível." });
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const answer = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join(" ").trim();
    if (!answer || answer.length > 800) return res.status(503).json({ message: "Resposta indisponível." });
    res.setHeader("Cache-Control", "no-store");
    return res.json({ answer });
  } catch {
    return res.status(503).json({ message: "Assistente online indisponível." });
  }
});

assistenteVoiceRouter.post("/voz", async (req, res) => {
  const isPreview = process.env.APP_ENV === "preview" ||
    /^https:\/\/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(process.env.SUPABASE_URL ?? "");
  if (!isPreview) return res.status(404).json({ message: "Indisponível." });

  const lineId = req.body?.lineId;
  if (typeof lineId !== "string" || !Object.prototype.hasOwnProperty.call(PUBLIC_VOICE_LINES, lineId)) {
    return res.status(400).json({ message: "Frase não permitida." });
  }
  const key = process.env.GEMINI_TTS_API_KEY?.trim();
  if (!key) return res.status(503).json({ message: "Voz online não configurada." });
  const cached = cachedAudio.get(lineId as keyof typeof PUBLIC_VOICE_LINES);
  if (cached) return res.json({ audio: cached, mimeType: "audio/wav" });

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model: "gemini-3.8-flash-lite-tts",
        input: [{ type: "user_input", content: [{ type: "text", text: PUBLIC_VOICE_LINES[lineId as keyof typeof PUBLIC_VOICE_LINES], annotations: [{ type: "speech_metadata", style: "Voz brasileira natural, cordial e clara." }] }] }],
        response_format: { type: "audio", mime_type: "audio/wav" },
        generation_config: { speech_config: [{ voice: "Kore" }] },
      }),
      signal: AbortSignal.timeout(14_000),
    });
    if (!response.ok) {
      console.warn("Assistente TTS indisponível, status:", response.status);
      return res.status(503).json({ message: "Voz online indisponível." });
    }
    const payload = await response.json() as { output_audio?: { data?: string }; steps?: Array<{ type?: string; content?: Array<{ type?: string; data?: string }> }> };
    const audio = payload.output_audio?.data ?? payload.steps?.flatMap(step => step.content ?? []).reverse().find(content => content.type === "audio")?.data;
    if (!audio || audio.length > 2_000_000) return res.status(503).json({ message: "Áudio indisponível." });
    cachedAudio.set(lineId as keyof typeof PUBLIC_VOICE_LINES, audio);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ audio, mimeType: "audio/wav" });
  } catch {
    return res.status(503).json({ message: "Voz online indisponível." });
  }
});
