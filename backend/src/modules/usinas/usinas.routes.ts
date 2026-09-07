import { Router } from "express";
import { upload } from "../../config/multer";

import {
  atualizarUsinaController,
  buscarUsinaController,
  criarUsinaController,
  dashboardUsinaController,
  excluirUsinaController,
  listarUsinasController,
  importarFaturaGeradoraController,
  alocarUnidadeController,
  cadastrarIntegracaoInversorController,
  excluirIntegracaoInversorController,
  listarIntegracoesInversoresController,
} from "./usinas.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/", listarUsinasController);

router.get("/:id", buscarUsinaController);

router.get("/:id/dashboard", dashboardUsinaController);

router.get("/:id/inversores", exigirAutenticacao, exigirGestor, listarIntegracoesInversoresController);
router.post("/:id/inversores", exigirAutenticacao, exigirGestor, cadastrarIntegracaoInversorController);
router.delete("/:id/inversores/:integracaoId", exigirAutenticacao, exigirGestor, excluirIntegracaoInversorController);

router.post("/:id/importar-fatura", upload.single("arquivo"), importarFaturaGeradoraController);
router.post("/:id/alocar-unidade", alocarUnidadeController);

router.post("/", criarUsinaController);

router.put("/:id", atualizarUsinaController);

router.delete("/:id", excluirUsinaController);

export default router;
