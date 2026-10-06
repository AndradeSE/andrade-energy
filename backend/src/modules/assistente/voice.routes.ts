import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { PUBLIC_VOICE_LINES } from "./voice-lines";

// A camada gratuita do Gemini não recebe falas, nomes ou dados da conta.
// O cliente envia somente um identificador; o texto é fixo e auditável aqui.
export const assistenteVoiceRouter = Router();
assistenteVoiceRouter.use(exigirAutenticacao);
assistenteVoiceRouter.use(rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }));

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

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model: "gemini-3.8-flash-lite-tts",
        input: [{ type: "user_input", content: [{ type: "text", text: PUBLIC_VOICE_LINES[lineId as keyof typeof PUBLIC_VOICE_LINES], annotations: [{ type: "speech_metadata", style: "Voz brasileira natural, cordial e clara." }] }] }],
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice: "Kore" }] },
      }),
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) return res.status(503).json({ message: "Voz online indisponível." });
    const payload = await response.json() as { steps?: Array<{ type?: string; content?: Array<{ type?: string; data?: string }> }> };
    const audio = payload.steps?.flatMap(step => step.content ?? []).reverse().find(content => content.type === "audio")?.data;
    if (!audio || audio.length > 2_000_000) return res.status(503).json({ message: "Áudio indisponível." });
    res.setHeader("Cache-Control", "no-store");
    return res.json({ audio, mimeType: "audio/wav" });
  } catch {
    return res.status(503).json({ message: "Voz online indisponível." });
  }
});
