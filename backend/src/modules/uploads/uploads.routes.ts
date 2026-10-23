import { Router } from "express";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { apiRateLimit } from "../../config/distributedRateLimit";
import { preparePdfUpload } from "./uploads.service";

const router = Router();
router.post("/preparar", exigirAutenticacao,
  apiRateLimit("upload-tickets", { windowMs: 60_000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false }),
  async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try { res.json(await preparePdfUpload(req)); }
    catch { res.status(400).json({ message: "Não foi possível preparar o PDF. Confira o formato e o limite de 10 MB." }); }
  });
export default router;
