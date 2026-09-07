import { Router } from "express";

import {
    dashboardController,
} from "./dashboard.controller";
import { exigirAutenticacao } from "../../middlewares/auth.middleware";
import { exigirContratoDaUc } from "../../middlewares/contratoAcesso.middleware";
import { exigirClienteDaSessaoOuGestor } from "../../utils/empresaScope";

const router = Router();

router.get(
  "/cliente",
  exigirAutenticacao,
  exigirClienteDaSessaoOuGestor("clienteId", "query"),
  exigirContratoDaUc,
  dashboardController
);

export default router;
