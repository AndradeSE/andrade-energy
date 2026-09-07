import { Router } from "express";
import { upload } from "../../config/multer";

import {
  importarFaturaController,
  analisarFaturaController,
  detalharFaturaController,
  listarFaturasController,
  excluirFaturaController,
  confirmarFaturaRascunhoController,
  regenerarDocumentosFaturaController,
  criarFaturaManualController,
  obterRelatorioCalculoFaturaController,
} from "./faturas.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { exigirContratoDaUc } from "../../middlewares/contratoAcesso.middleware";

const router = Router();

router.get(
  "/",
  exigirAutenticacao, exigirContratoDaUc,
  listarFaturasController
);

router.post(
  "/analisar",
  upload.single("arquivo"),
  analisarFaturaController
);

router.get("/:id/relatorio-calculo", exigirAutenticacao, exigirContratoDaUc, obterRelatorioCalculoFaturaController);
router.get("/:id", exigirAutenticacao, exigirContratoDaUc, detalharFaturaController);
router.delete("/:id", excluirFaturaController);
router.post("/:id/confirmar", exigirAutenticacao, exigirGestor, confirmarFaturaRascunhoController);
router.post("/:id/regenerar-documentos", exigirAutenticacao, exigirGestor, regenerarDocumentosFaturaController);
router.post("/manual/criar", exigirAutenticacao, exigirGestor, criarFaturaManualController);

router.post(
  "/importar",
  upload.single("arquivo"),
  importarFaturaController
);

export default router;
