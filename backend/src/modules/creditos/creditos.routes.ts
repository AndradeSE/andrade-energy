
import { consumirCreditosController } from "./consumo.controller";


import { Router } from "express";
import { listarCreditosController } from "./creditos.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { exigirClienteDaSessaoOuGestor } from "../../utils/empresaScope";
const router = Router();
router.use(exigirAutenticacao);
router.post(
  "/consumir",
  exigirGestor,
  consumirCreditosController
);
router.get(
  "/:clienteId",
  exigirClienteDaSessaoOuGestor("clienteId"),
  listarCreditosController
);

export default router;
