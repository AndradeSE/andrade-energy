import { Router } from "express";

import {
  atualizarClienteController,
  buscarClienteController,
  criarClienteController,
  excluirClienteController,
  listarClientesController,
  listarUnidadesClienteController,
} from "./clientes.controller";

const router = Router();

router.get("/", listarClientesController);

router.get("/:id/unidades", listarUnidadesClienteController);

router.get("/:id", buscarClienteController);

router.post("/", criarClienteController);

router.put("/:id", atualizarClienteController);

router.delete("/:id", excluirClienteController);

export default router;
