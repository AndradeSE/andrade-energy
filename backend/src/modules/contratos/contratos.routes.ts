import { Router } from "express";

import {
    atualizarContratoController,
    buscarContratoController,
    criarContratoController,
    excluirContratoController,
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

router.delete(
  "/:id",
  excluirContratoController
);

export default router;