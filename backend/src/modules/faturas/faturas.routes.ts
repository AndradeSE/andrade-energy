import { consultarEncargosBoleto } from "./encargosBoleto.service";
import { empresaIdDaRequisicao } from "../../utils/empresaScope";
import { visualizarPaginaFatura } from "./visualizacaoFatura";
import { Router } from "express";
import { upload } from "../../config/multer";

import {
  importarFaturaController,
  analisarFaturaController,
  detalharFaturaController,
  listarFaturasController,
  excluirFaturaController,
  registrarBaixaFaturaController,
  confirmarFaturaRascunhoController,
  regenerarDocumentosFaturaController,
  criarFaturaManualController,
  obterRelatorioCalculoFaturaController,
} from "./faturas.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { exigirContratoDaUc } from "../../middlewares/contratoAcesso.middleware";

const router = Router();

router.use(exigirAutenticacao);

router.get(
  "/",
  exigirContratoDaUc,
  listarFaturasController
);

router.post(
  "/analisar",
  exigirGestor,
  upload.single("arquivo"),
  analisarFaturaController
);

router.get("/:id/visualizacao", exigirContratoDaUc, (req, res) => {
  void visualizarPaginaFatura(req, res).catch(() => { res.status(503).json({ message: "Não foi possível consultar a fatura." }); });
});
router.get("/:id/relatorio-calculo", exigirContratoDaUc, obterRelatorioCalculoFaturaController);
router.get("/:id/encargos-boleto", exigirContratoDaUc, async (req, res) => {
  try {
    return res.json(await consultarEncargosBoleto(req.params.id, empresaIdDaRequisicao(req)));
  } catch {
    return res.status(503).json({ message: "Não foi possível confirmar os encargos desse boleto." });
  }
});
router.get("/:id", exigirContratoDaUc, detalharFaturaController);
router.delete("/:id", exigirGestor, excluirFaturaController);
router.post("/:id/baixa", exigirGestor, registrarBaixaFaturaController);
router.post("/:id/confirmar", exigirGestor, confirmarFaturaRascunhoController);
router.post("/:id/regenerar-documentos", exigirGestor, regenerarDocumentosFaturaController);
router.post("/manual/criar", exigirGestor, criarFaturaManualController);

router.post(
  "/importar",
  exigirGestor,
  upload.single("arquivo"),
  importarFaturaController
);

export default router;
