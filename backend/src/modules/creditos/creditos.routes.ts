
import { consumirCreditosController } from "./consumo.controller";


import { Router } from "express";
import { listarCreditosController } from "./creditos.controller";
console.log("controller =", listarCreditosController);
const router = Router();
router.post(
  "/consumir",
  consumirCreditosController
);
router.get(
  "/:clienteId",
  listarCreditosController
);

export default router;