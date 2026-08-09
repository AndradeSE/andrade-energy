import { Router } from "express";
import {
    criarParticipacaoController,
    listarParticipacoesController,
} from "./participacoes.controller";

const router = Router();

// Lista os clientes vinculados a uma usina
router.get(
  "/:usinaId",
  listarParticipacoesController
);

// Vincula um cliente a uma usina
router.post(
  "/",
  criarParticipacaoController
);

export default router;