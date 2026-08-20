import { Router } from "express";

import {
    atualizarContratoController,
    buscarContratoController,
    criarContratoController,
    excluirContratoController,
    cancelarContratoController,
} from "./contratos.controller";

const router = Router();

router.get(
  "/:clienteId",
  buscarContratoController
);

router.post(
  "/",
  criarContratoController
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
