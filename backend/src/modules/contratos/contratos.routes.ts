import { Router } from "express";

import {
    atualizarContratoController,
    buscarContratoController,
    criarContratoController,
    excluirContratoController,
    cancelarContratoController,
    salvarContratoDaUnidadeController,
    buscarContratoDaUnidadeController,
    gerarContratoDaUnidadeController,
    importarContratoAssinadoDaUnidadeController,
} from "./contratos.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { upload } from "../../config/multer";

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

router.post(
  "/unidade/:unidadeId/gerar-documento",
  exigirAutenticacao,
  exigirGestor,
  gerarContratoDaUnidadeController
);

router.post(
  "/unidade/:unidadeId/contrato-assinado",
  exigirAutenticacao,
  exigirGestor,
  upload.single("arquivo"),
  importarContratoAssinadoDaUnidadeController
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
