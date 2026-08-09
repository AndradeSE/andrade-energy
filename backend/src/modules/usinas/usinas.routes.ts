import { Router } from "express";

import {
  atualizarUsinaController,
  buscarUsinaController,
  criarUsinaController,
  dashboardUsinaController,
  excluirUsinaController,
  listarUsinasController,
} from "./usinas.controller";

const router = Router();

router.get("/", listarUsinasController);

router.get("/:id", buscarUsinaController);

router.get("/:id/dashboard", dashboardUsinaController);

router.post("/", criarUsinaController);

router.put("/:id", atualizarUsinaController);

router.delete("/:id", excluirUsinaController);

export default router;