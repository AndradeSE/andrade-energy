import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { configuracaoAdesaoPublica, criarAdesaoPublica, statusAdesaoPublica } from "./adesaoAssinatura.service";
import { exigirAutenticacao, exigirOperacaoComercial, exigirSuperAdministradorAndrade } from "../../middlewares/auth.middleware";
import * as controller from "./comercial.controller";
import { alterarTransferenciaAutomaticaAssinaturas } from "./comercial.service";
import { autenticadorAtivo, confirmarAutenticador, confirmarSenhaFinanceira, iniciarAutenticador, validarCodigoFinanceiro } from "../financeiro-seguranca/financeiroSeguranca.service";

const router = Router();
router.get("/planos-publicos", controller.planosPublicos);
router.get("/adesao/configuracao", async (_req, res) => {
  try { res.setHeader("Cache-Control", "no-store"); return res.json(await configuracaoAdesaoPublica()); }
  catch { return res.status(503).json({ message: "Não foi possível consultar os planos agora." }); }
});
router.post("/adesao/checkout", rateLimit({ windowMs: 15*60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false }), async (req,res) => {
  try { return res.status(201).json(await criarAdesaoPublica(req.body, String(req.header("Idempotency-Key") ?? ""), { ip: req.ip, userAgent: req.get("user-agent") })); }
  catch (e: any) { return res.status(400).json({ message: e?.message ?? "Não foi possível iniciar a contratação." }); }
});
router.get("/adesao/status", async (req,res) => {
  try { res.setHeader("Cache-Control", "no-store"); return res.json(await statusAdesaoPublica(String(req.header("X-Adesao-Chave") ?? ""))); }
  catch { return res.status(404).json({ message: "Contratação não encontrada." }); }
});
router.get("/minha-assinatura", exigirAutenticacao, controller.minhaAssinatura);
router.get("/minha-assinatura/termos", exigirAutenticacao, controller.termosMinhaAssinatura);
router.post("/minha-assinatura/checkout", exigirAutenticacao, controller.checkoutMinhaAssinatura);
router.use(exigirAutenticacao);
router.get("/painel", exigirOperacaoComercial, controller.painel);
router.use(exigirSuperAdministradorAndrade);
router.get("/financeiro/autenticador", async (req, res) => { try { return res.json({ ativo: await autenticadorAtivo((req as any).usuario.id) }); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/financeiro/autenticador/confirmar-senha", async (req, res) => { try { return res.json(await confirmarSenhaFinanceira((req as any).usuario, String(req.body?.senhaAtual ?? ""))); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/financeiro/autenticador/validar-codigo", async (req, res) => { try { return res.json(await validarCodigoFinanceiro((req as any).usuario, String(req.body?.senhaAtual ?? ""), String(req.body?.codigo ?? ""), "comercial")); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/financeiro/autenticador/iniciar", async (req, res) => { try { return res.json(await iniciarAutenticador((req as any).usuario, String(req.body?.senhaAtual ?? ""))); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/financeiro/autenticador/confirmar", async (req, res) => { try { return res.json(await confirmarAutenticador((req as any).usuario.id, String(req.body?.codigo ?? ""))); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/planos", controller.criarPlano);
router.put("/planos/:id", controller.atualizarPlano);
router.get("/financeiro", controller.financeiro);
router.post("/financeiro/validar-pix", controller.validarPixFinanceiro);
router.put("/financeiro", controller.configurarFinanceiro);
router.patch("/financeiro/transferencia-automatica", async (req, res) => { try { return res.json(await alterarTransferenciaAutomaticaAssinaturas((req as any).usuario, req.body?.ativa)); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/financeiro/transferencias", controller.transferirFinanceiro);
router.post("/assinaturas", controller.contratar);
router.patch("/assinaturas/:id/status", controller.status);
router.patch("/assinaturas/:id/arquivo", controller.arquivar);
router.post("/assinaturas/:id/cobrancas", controller.cobrar);
router.get("/assinaturas/:id/cobrancas", controller.cobrancas);
export default router;
