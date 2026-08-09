import { Router } from "express";

import {
    buscarFechamentoController,
    criarFechamentoController,
    listarFechamentosController,
    resumoOperacaoController,
} from "./fechamentos.controller";

const router = Router();

router.get(
  "/",
  listarFechamentosController
);

router.get(
  "/resumo",
  resumoOperacaoController
);

router.get(
  "/:id",
  buscarFechamentoController
);

router.post(
  "/",
  criarFechamentoController
);

export default router;