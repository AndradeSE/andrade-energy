import { Router } from "express";

import {
  atualizarClienteController,
  buscarClienteController,
  confirmarCadastroClienteController,
  buscarUnidadeController,
  criarClienteController,
  excluirClienteController,
  listarClientesController,
  listarTodasUnidadesController,
  listarUnidadesClienteController,
  listarMinhasUnidadesController,
  nomearMinhaUnidadeController,
  cadastrarUnidadeClienteController,
  excluirUnidadeClienteController,
  obterSolicitacaoCadastroClienteController,
  anexarFaturaClienteController,
  listarFaturasAnexadasClienteController,
  excluirFaturaAnexadaClienteController,
} from "./clientes.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { upload } from "../../config/multer";
import { exigirClienteDaSessaoOuGestor, exigirUnidadeDaSessaoOuGestor } from "../../utils/empresaScope";
import { exigirCapacidadeDoPlano } from "../../middlewares/limitesPlano.middleware";
import {empresaIdDaRequisicao} from '../../utils/empresaScope';
import {obterRateioUc,salvarRateioUc} from '../usinas/rateioUc.service';

const router = Router();

router.use(exigirAutenticacao);

router.get("/", exigirGestor, listarClientesController);

router.get("/minhas-unidades", exigirAutenticacao, listarMinhasUnidadesController);
router.patch("/minhas-unidades/:unidadeId/apelido", exigirAutenticacao, nomearMinhaUnidadeController);
router.get("/unidades", exigirAutenticacao, exigirGestor, listarTodasUnidadesController);
router.get('/unidade/:unidadeId/rateio',exigirGestor,exigirUnidadeDaSessaoOuGestor(),async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 try{return res.json(await obterRateioUc(empresaIdDaRequisicao(req),req.params.unidadeId));}catch{return res.status(503).json({message:'Não foi possível consultar o rateio da UC.'});}
});
router.put('/unidade/:unidadeId/rateio',exigirGestor,exigirUnidadeDaSessaoOuGestor(),async(req,res)=>{
 if(String((req as any).usuario?.papel_empresa??'').startsWith('COLABORADOR_'))return res.status(403).json({message:'Somente o titular ou ADM pode alterar o rateio da UC.'});
 try{return res.json(await salvarRateioUc(empresaIdDaRequisicao(req),req.params.unidadeId,req.body?.ativo));}catch{return res.status(400).json({message:'Não foi possível alterar o rateio da UC.'});}
});
router.get("/unidade/:unidadeId", exigirUnidadeDaSessaoOuGestor(), buscarUnidadeController);

router.get("/:id/unidades", exigirClienteDaSessaoOuGestor("id"), listarUnidadesClienteController);
router.post("/:id/unidades", exigirAutenticacao, exigirGestor, cadastrarUnidadeClienteController);
router.delete("/unidade/:unidadeId", exigirAutenticacao, exigirGestor, excluirUnidadeClienteController);

router.get("/:id/solicitacao-cadastro", exigirAutenticacao, exigirGestor, obterSolicitacaoCadastroClienteController);
router.post("/:id/confirmar-cadastro", exigirAutenticacao, exigirGestor, confirmarCadastroClienteController);
router.get("/:id/faturas-anexadas", exigirClienteDaSessaoOuGestor("id"), listarFaturasAnexadasClienteController);
router.post("/:id/faturas-anexadas", exigirClienteDaSessaoOuGestor("id"), upload.single("arquivo"), anexarFaturaClienteController);
router.delete("/:id/faturas-anexadas/:anexoId", exigirAutenticacao, exigirGestor, excluirFaturaAnexadaClienteController);

router.get("/:id", exigirClienteDaSessaoOuGestor("id"), buscarClienteController);

router.post("/", exigirGestor, exigirCapacidadeDoPlano("clientes"), criarClienteController);

router.put("/:id", exigirGestor, atualizarClienteController);

router.delete("/:id", exigirAutenticacao, exigirGestor, excluirClienteController);

export default router;
