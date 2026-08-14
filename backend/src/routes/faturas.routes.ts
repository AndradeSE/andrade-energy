import { Router } from "express";
import multer from "multer";

import {
  importarFaturaController,
  listarFaturasController,
} from "../controllers/faturas.controller";

const router = Router();

const upload = multer({
  dest: "src/uploads",
});

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