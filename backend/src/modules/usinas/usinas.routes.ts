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
} from "./usinas.controller";

const router = Router();

router.get("/", listarUsinasController);

router.get("/:id", buscarUsinaController);

router.get("/:id/dashboard", dashboardUsinaController);

router.post("/:id/importar-fatura", upload.single("arquivo"), importarFaturaGeradoraController);

router.post("/", criarUsinaController);

router.put("/:id", atualizarUsinaController);

router.delete("/:id", excluirUsinaController);

export default router;
