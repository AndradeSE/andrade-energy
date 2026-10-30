import { Router } from "express";
import { apiRateLimit } from "../../config/distributedRateLimit";
import { solicitarRecuperacaoAutenticador, confirmarRecuperacaoAutenticador } from "./recuperacaoAutenticador.service";

// Mount only after the same account/tenant/financial-owner checks as the existing TOTP routes.
export function rotasRecuperacaoAutenticador() {
  const router = Router();
  router.use(apiRateLimit("totp-recovery", { windowMs: 15 * 60_000, limit: 15 }), (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store"); next();
  });
  router.post("/solicitar", async (req, res) => {
    try { return res.json(await solicitarRecuperacaoAutenticador((req as any).usuario, String(req.body?.senhaAtual ?? ""))); }
    catch (error: any) { return res.status(400).json({ message: error.message }); }
  });
  router.post("/confirmar", async (req, res) => {
    try { return res.json(await confirmarRecuperacaoAutenticador((req as any).usuario, String(req.body?.senhaAtual ?? ""), String(req.body?.solicitacaoId ?? ""), String(req.body?.codigoEmail ?? ""))); }
    catch (error: any) { return res.status(400).json({ message: error.message }); }
  });
  return router;
}
