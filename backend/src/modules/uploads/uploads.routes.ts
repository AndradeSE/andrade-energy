import { Router } from "express";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { apiRateLimit } from "../../config/distributedRateLimit";
import { preparePdfUpload } from "./uploads.service";
import { PdfUploadPreparationError } from "./uploadPolicy";

const router = Router();
router.post("/preparar", exigirAutenticacao,
  apiRateLimit("upload-tickets", { windowMs: 60_000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false }),
  async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try { res.json(await preparePdfUpload(req)); }
    catch (error) {
      if (error instanceof PdfUploadPreparationError) {
        const scope = error.code === "UPLOAD_SCOPE_INVALID";
        return res.status(scope ? 403 : 503).json({ code: error.code,
          message: scope ? "Selecione a empresa da sua conta antes de enviar o PDF." : "O armazenamento temporário do PDF está indisponível. Tente novamente após a conferência do serviço." });
      }
      return res.status(400).json({ code: "UPLOAD_METADATA_INVALID", message: "Não foi possível preparar o PDF. Confira o formato e o limite de 10 MB." });
    }
  });
export default router;
