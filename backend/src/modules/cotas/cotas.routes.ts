import { Router } from "express";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { usuarioEhSuperAdministradorAndrade } from "../../config/empresa";
import { listServiceQuotas, monitorServiceQuotas, registerManualQuota } from "./cotas.service";
import { apiRateLimit } from "../../config/distributedRateLimit";

const router = Router();
router.use(exigirAutenticacao, (req, res, next) => {
  if (!usuarioEhSuperAdministradorAndrade((req as any).usuario)) return res.status(403).json({ message: "Acesso exclusivo de administradores da plataforma." });
  res.setHeader("Cache-Control", "no-store");
  next();
});
router.get("/", async (req, res) => {
  try { res.json(await listServiceQuotas(req.query.catalogo === "2")); } catch { res.status(503).json({ message: "Não foi possível consultar as cotas agora." }); }
});
router.post("/leitura-confirmada", apiRateLimit("quota-manual", { windowMs: 60_000, limit: 5 }), async (req, res) => {
  try { await registerManualQuota(req.body, String((req as any).usuario.id)); res.json(await listServiceQuotas(req.query.catalogo === "2")); }
  catch { res.status(400).json({ message: "Confira os valores, a validade e a confirmação da leitura no painel." }); }
});
router.post("/atualizar", apiRateLimit("quota-refresh", { windowMs: 60_000, limit: 1 }), async (req, res) => {
  try { await monitorServiceQuotas(); res.json(await listServiceQuotas(req.query.catalogo === "2")); }
  catch { res.status(503).json({ message: "Não foi possível atualizar as cotas agora." }); }
});
export default router;
