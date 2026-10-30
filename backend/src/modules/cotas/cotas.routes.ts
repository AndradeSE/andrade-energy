import { Router } from "express";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { usuarioEhSuperAdministradorAndrade } from "../../config/empresa";
import { listServiceQuotas, monitorServiceQuotas } from "./cotas.service";
import { apiRateLimit } from "../../config/distributedRateLimit";

const router = Router();
router.use(exigirAutenticacao, (req, res, next) => {
  if (!usuarioEhSuperAdministradorAndrade((req as any).usuario)) return res.status(403).json({ message: "Acesso exclusivo de administradores da plataforma." });
  res.setHeader("Cache-Control", "no-store");
  next();
});
router.get("/", async (req, res) => {
  try { res.json(await listServiceQuotas(["2", "3"].includes(String(req.query.catalogo)), req.query.catalogo === "3")); } catch { res.status(503).json({ message: "Não foi possível consultar as cotas agora." }); }
});
router.post("/atualizar", apiRateLimit("quota-refresh", { windowMs: 60_000, limit: 1 }), async (req, res) => {
  try { await monitorServiceQuotas(); res.json(await listServiceQuotas(["2", "3"].includes(String(req.query.catalogo)), req.query.catalogo === "3")); }
  catch { res.status(503).json({ message: "Não foi possível atualizar as cotas agora." }); }
});
export default router;
