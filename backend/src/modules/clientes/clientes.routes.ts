import { Router } from "express";

import {
  atualizarClienteController,
  buscarClienteController,
  buscarUnidadeController,
  criarClienteController,
  excluirClienteController,
  listarClientesController,
  listarTodasUnidadesController,
  listarUnidadesClienteController,
  listarMinhasUnidadesController,
  cadastrarUnidadeClienteController,
  excluirUnidadeClienteController,
} from "./clientes.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/", listarClientesController);

router.get("/minhas-unidades", exigirAutenticacao, listarMinhasUnidadesController);
router.get("/unidades", exigirAutenticacao, exigirGestor, listarTodasUnidadesController);
router.get("/unidade/:unidadeId", exigirAutenticacao, buscarUnidadeController);

router.get("/:id/unidades", listarUnidadesClienteController);
router.post("/:id/unidades", exigirAutenticacao, exigirGestor, cadastrarUnidadeClienteController);
router.delete("/unidade/:unidadeId", exigirAutenticacao, exigirGestor, excluirUnidadeClienteController);

router.get("/:id", buscarClienteController);

router.post("/", criarClienteController);

router.put("/:id", atualizarClienteController);

router.delete("/:id", excluirClienteController);

export default router;
