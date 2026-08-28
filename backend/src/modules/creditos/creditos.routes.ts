
import { consumirCreditosController } from "./consumo.controller";


import { Router } from "express";
import { listarCreditosController } from "./creditos.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { exigirRegistroDaEmpresa } from "../../utils/empresaScope";
const router = Router();
router.use(exigirAutenticacao);
router.post(
  "/consumir",
  exigirGestor,
  consumirCreditosController
);
router.get(
  "/:clienteId",
  exigirRegistroDaEmpresa("clientes", "clienteId"),
  listarCreditosController
);

export default router;
