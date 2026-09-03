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
} from "./faturas.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";

const router = Router();

router.get(
  "/",
  listarFaturasController
);

router.post(
  "/analisar",
  upload.single("arquivo"),
  analisarFaturaController
);

router.get("/:id", detalharFaturaController);
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
