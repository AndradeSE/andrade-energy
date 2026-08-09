import { Router } from "express";
import { upload } from "../../config/multer";

import {
  importarFaturaController,
  listarFaturasController,
} from "./faturas.controller";

const router = Router();

router.get(
  "/",
  listarFaturasController
);

router.post(
  "/importar",
  upload.single("arquivo"),
  importarFaturaController
);

export default router;