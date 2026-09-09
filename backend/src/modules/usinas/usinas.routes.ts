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
import { exigirUsinaDaSessaoOuGestor } from "../../utils/empresaScope";
import { exigirCapacidadeDoPlano } from "../../middlewares/limitesPlano.middleware";

const router = Router();

router.use(exigirAutenticacao);

router.get("/", exigirGestor, listarUsinasController);

router.get("/:id", exigirUsinaDaSessaoOuGestor(), buscarUsinaController);

router.get("/:id/dashboard", exigirUsinaDaSessaoOuGestor(), dashboardUsinaController);

router.get("/:id/inversores", exigirAutenticacao, exigirGestor, listarIntegracoesInversoresController);
router.post("/:id/inversores", exigirAutenticacao, exigirGestor, cadastrarIntegracaoInversorController);
router.delete("/:id/inversores/:integracaoId", exigirAutenticacao, exigirGestor, excluirIntegracaoInversorController);

router.post("/:id/importar-fatura", exigirGestor, upload.single("arquivo"), importarFaturaGeradoraController);
router.post("/:id/alocar-unidade", exigirGestor, alocarUnidadeController);

router.post("/", exigirGestor, exigirCapacidadeDoPlano("usinas"), criarUsinaController);

router.put("/:id", exigirGestor, atualizarUsinaController);

router.delete("/:id", exigirGestor, excluirUsinaController);

export default router;
