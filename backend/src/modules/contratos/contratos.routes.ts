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
    registrarAceiteEletronicoController,
    importarContratoAssinadoPeloClienteController,
} from "./contratos.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { upload } from "../../config/multer";
import { exigirRegistroDaEmpresa } from "../../utils/empresaScope";

const router = Router();
router.use(exigirAutenticacao);

router.get(
  "/unidade/:unidadeId",
  exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"),
  buscarContratoDaUnidadeController
);

router.get(
  "/:clienteId",
  exigirRegistroDaEmpresa("clientes", "clienteId"),
  buscarContratoController
);

router.post(
  "/",
  exigirGestor,
  criarContratoController
);

router.put(
  "/unidade/:unidadeId",
  exigirGestor,
  exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"),
  salvarContratoDaUnidadeController
);

router.post(
  "/unidade/:unidadeId/gerar-documento",
  exigirGestor,
  exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"),
  gerarContratoDaUnidadeController
);

router.post(
  "/unidade/:unidadeId/contrato-assinado",
  exigirGestor,
  exigirRegistroDaEmpresa("unidades_consumidoras", "unidadeId"),
  upload.single("arquivo"),
  importarContratoAssinadoDaUnidadeController
);

router.post("/:id/aceite-eletronico", exigirRegistroDaEmpresa("contratos"), registrarAceiteEletronicoController);
router.post("/:id/contrato-assinado-cliente", exigirRegistroDaEmpresa("contratos"), upload.single("arquivo"), importarContratoAssinadoPeloClienteController);

router.put(
  "/:id",
  exigirGestor,
  exigirRegistroDaEmpresa("contratos"),
  atualizarContratoController
);

router.post("/:id/cancelar", exigirRegistroDaEmpresa("contratos"), cancelarContratoController);

router.delete(
  "/:id",
  exigirGestor,
  exigirRegistroDaEmpresa("contratos"),
  excluirContratoController
);

export default router;
