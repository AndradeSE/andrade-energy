import { Router } from "express";
import { upload } from "../../config/multer";

import {
  importarFaturaController,
  analisarFaturaController,
  detalharFaturaController,
  listarFaturasController,
  excluirFaturaController,
} from "./faturas.controller";

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

router.post(
  "/importar",
  upload.single("arquivo"),
  importarFaturaController
);

export default router;
