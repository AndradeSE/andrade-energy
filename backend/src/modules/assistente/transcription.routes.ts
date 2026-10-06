import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import { transcribeAudio } from "./transcription";

// Mounted after authentication. Never persist audio or log its transcript.
export const transcriptionRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2_000_000, files: 1, fields: 2 } });
transcriptionRouter.use((req, res, next) => {
  const preview = process.env.APP_ENV === "preview" || /^https:\/\/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(process.env.SUPABASE_URL ?? "");
  if (!preview) return res.status(404).json({ message: "Indisponível." });
  res.setHeader("Cache-Control", "no-store");
  next();
});
transcriptionRouter.use(rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: "draft-8", legacyHeaders: false }));
transcriptionRouter.post("/", (req, res, next) => {
  upload.single("audio")(req, res, error => {
    if (error) return res.status(400).json({ message: "Áudio inválido ou maior que o permitido." });
    next();
  });
}, async (req, res) => {
  const file = req.file;
  try {
    if (req.body?.audioConsent !== "true" || !file || !["audio/mp4", "audio/m4a", "audio/webm"].includes(file.mimetype)) {
      return res.status(400).json({ message: "Áudio e autorização são necessários." });
    }
    const mp4 = file.buffer.subarray(4, 8).toString() === "ftyp";
    const webm = file.buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    if (!(file.mimetype === "audio/webm" ? webm : mp4)) return res.status(400).json({ message: "Formato de áudio inválido." });
    const key = process.env.GROQ_ASSISTANT_API_KEY?.trim();
    if (!key) return res.status(503).json({ message: "Transcrição online não configurada." });
    const text = await transcribeAudio(file.buffer, file.mimetype, key);
    return res.json({ text, provider: "groq" });
  } catch (error) {
    const quota = error instanceof Error && error.message === "TRANSCRIPTION_QUOTA";
    return res.status(503).json({ message: quota ? "Limite da transcrição atingido. Tente mais tarde." : "Não foi possível transcrever o áudio agora." });
  } finally { file?.buffer.fill(0); }
});
