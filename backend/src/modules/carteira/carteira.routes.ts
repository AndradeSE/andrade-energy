import { Router } from "express";
import { exigirAutenticacao, exigirGestor, exigirTitularFinanceiro } from "../../middlewares/auth.middleware";
import { alterarTransferenciaAutomatica, atualizarCarteira, consultarTitularChavePix, resumoCarteira, transferirCarteira } from "./carteira.service";
import { autenticadorAtivo, confirmarAutenticador, confirmarSenhaFinanceira, iniciarAutenticador, validarCodigoFinanceiro } from "../financeiro-seguranca/financeiroSeguranca.service";
import { carregarFinanceiro } from "../financeiro/financeiro.service";
import { empresaIdDaRequisicao } from "../../utils/empresaScope";

const router = Router();
router.use(exigirAutenticacao, exigirGestor, exigirTitularFinanceiro);
router.get("/resumo-faturas", async (req, res) => {
  const usinaId = typeof req.query.usinaId === "string" ? req.query.usinaId.trim() : "";
  if (!usinaId) return res.status(400).json({ message: "Selecione uma usina para ver o financeiro." });
  try { return res.json(await carregarFinanceiro(empresaIdDaRequisicao(req), usinaId)); }
  catch (error: any) {
    console.error("Falha no resumo financeiro", { empresaId: empresaIdDaRequisicao(req), usinaId, tipo: error?.code ?? error?.name ?? "Error" });
    return res.status(error?.message === "Usina não encontrada nesta empresa." ? 404 : 500).json({ message: "Não foi possível carregar o resumo financeiro." });
  }
});
router.get("/autenticador", async (req, res) => { try { return res.json({ ativo: await autenticadorAtivo((req as any).usuario.id) }); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/autenticador/confirmar-senha", async (req, res) => { try { return res.json(await confirmarSenhaFinanceira((req as any).usuario, String(req.body?.senhaAtual ?? ""))); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/autenticador/validar-codigo", async (req, res) => { try { return res.json(await validarCodigoFinanceiro((req as any).usuario, String(req.body?.senhaAtual ?? ""), String(req.body?.codigo ?? ""))); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/autenticador/iniciar", async (req, res) => { try { return res.json(await iniciarAutenticador((req as any).usuario, String(req.body?.senhaAtual ?? ""))); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/autenticador/confirmar", async (req, res) => { try { return res.json(await confirmarAutenticador((req as any).usuario.id, String(req.body?.codigo ?? ""))); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.get("/", async (req, res) => { try { return res.json(await resumoCarteira((req as any).usuario)); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/validar-pix", async (req, res) => { try { return res.json(await consultarTitularChavePix(req.body?.pixTipo, req.body?.pixChave)); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.put("/", async (req, res) => { try { return res.json(await atualizarCarteira((req as any).usuario, req.body)); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.patch("/transferencia-automatica", async (req, res) => { try { return res.json(await alterarTransferenciaAutomatica((req as any).usuario, req.body?.ativa)); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
router.post("/transferencias", async (req, res) => { try { return res.json(await transferirCarteira((req as any).usuario, req.body, String(req.header("Idempotency-Key") ?? ""))); } catch (error: any) { return res.status(400).json({ message: error.message }); } });
export default router;

