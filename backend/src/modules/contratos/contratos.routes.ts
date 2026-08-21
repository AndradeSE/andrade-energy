import { Router } from "express";

import {
    atualizarContratoController,
    buscarContratoController,
    criarContratoController,
    excluirContratoController,
    cancelarContratoController,
    salvarContratoDaUnidadeController,
    buscarContratoDaUnidadeController,
} from "./contratos.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";

const router = Router();

router.get(
  "/unidade/:unidadeId",
  buscarContratoDaUnidadeController
);

router.get(
  "/:clienteId",
  buscarContratoController
);

router.post(
  "/",
  criarContratoController
);

router.put(
  "/unidade/:unidadeId",
  exigirAutenticacao,
  exigirGestor,
  salvarContratoDaUnidadeController
);

router.put(
  "/:id",
  atualizarContratoController
);

router.post("/:id/cancelar", cancelarContratoController);

router.delete(
  "/:id",
  excluirContratoController
);

export default router;
