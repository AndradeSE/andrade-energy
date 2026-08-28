import { Router } from "express";
import { exigirAdministrador, exigirAutenticacao } from "../../middlewares/auth.middleware";
import { atualizarEmpresa, criarEmpresa, listarEmpresas, obterEmpresaAtual } from "./empresas.service";

const router = Router();

router.get("/atual", exigirAutenticacao, async (req, res) => {
  try { return res.json(await obterEmpresaAtual((req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.get("/", exigirAutenticacao, exigirAdministrador, async (req, res) => {
  try { return res.json(await listarEmpresas((req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.post("/", exigirAutenticacao, exigirAdministrador, async (req, res) => {
  try { return res.status(201).json(await criarEmpresa(req.body, (req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.patch("/:id", exigirAutenticacao, exigirAdministrador, async (req, res) => {
  try { return res.json(await atualizarEmpresa(req.params.id, req.body, (req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

export default router;
