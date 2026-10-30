import { Router } from "express";

import {
  buscarFechamentoController,
  criarFechamentoController,
  listarFechamentosController,
  resumoOperacaoController,
} from "./fechamentos.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { exigirRegistroDaEmpresa } from "../../utils/empresaScope";

const router = Router();
router.use(exigirAutenticacao, exigirGestor);

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
  exigirRegistroDaEmpresa("fechamentos"),
  buscarFechamentoController
);

router.post(
  "/",
  criarFechamentoController
);

export default router;
