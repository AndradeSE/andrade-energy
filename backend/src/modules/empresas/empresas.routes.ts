import { Router } from "express";
import { exigirAutenticacao, exigirSuperAdministradorAndrade } from "../../middlewares/auth.middleware";
import { atualizarEmpresa, criarEmpresa, listarEmpresas, listarMinhasEmpresas, obterEmpresaAtual, obterMinhaIdentidade, salvarMinhaIdentidade, selecionarEmpresaAtiva } from "./empresas.service";

const router = Router();

router.get("/minhas", exigirAutenticacao, async (req, res) => {
  try { return res.json(await listarMinhasEmpresas((req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.post("/:id/selecionar", exigirAutenticacao, async (req, res) => {
  try { return res.json(await selecionarEmpresaAtiva(req.params.id, (req as any).usuario, (req as any).sessaoId)); }
  catch (error: any) { return res.status(403).json({ message: error.message }); }
});

router.get("/atual", exigirAutenticacao, async (req, res) => {
  try { return res.json(await obterEmpresaAtual((req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.get("/minha-identidade", exigirAutenticacao, async (req, res) => {
  try { return res.json(await obterMinhaIdentidade((req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.patch("/minha-identidade", exigirAutenticacao, async (req, res) => {
  try { return res.json(await salvarMinhaIdentidade(req.body, (req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.get("/", exigirAutenticacao, exigirSuperAdministradorAndrade, async (req, res) => {
  try { return res.json(await listarEmpresas((req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.post("/", exigirAutenticacao, exigirSuperAdministradorAndrade, async (req, res) => {
  try { return res.status(201).json(await criarEmpresa(req.body, (req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.patch("/:id", exigirAutenticacao, exigirSuperAdministradorAndrade, async (req, res) => {
  try { return res.json(await atualizarEmpresa(req.params.id, req.body, (req as any).usuario)); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

export default router;
