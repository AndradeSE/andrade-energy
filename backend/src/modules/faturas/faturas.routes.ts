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

router.use(exigirAutenticacao);

router.get(
  "/",
  exigirContratoDaUc,
  listarFaturasController
);

router.post(
  "/analisar",
  exigirGestor,
  upload.single("arquivo"),
  analisarFaturaController
);

router.get("/:id/relatorio-calculo", exigirContratoDaUc, obterRelatorioCalculoFaturaController);
router.get("/:id", exigirContratoDaUc, detalharFaturaController);
router.delete("/:id", exigirGestor, excluirFaturaController);
router.post("/:id/confirmar", exigirGestor, confirmarFaturaRascunhoController);
router.post("/:id/regenerar-documentos", exigirGestor, regenerarDocumentosFaturaController);
router.post("/manual/criar", exigirGestor, criarFaturaManualController);

router.post(
  "/importar",
  exigirGestor,
  upload.single("arquivo"),
  importarFaturaController
);

export default router;
