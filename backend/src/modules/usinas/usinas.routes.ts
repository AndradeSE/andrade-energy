import { Router } from "express";
import { upload } from "../../config/multer";

import {
  atualizarUsinaController,
  buscarUsinaController,
  criarUsinaController,
  dashboardUsinaController,
  excluirUsinaController,
  listarUsinasController,
  migrarUnidadesDaUsinaController,
  importarFaturaGeradoraController,
  importarProducaoPelaUcController,
  alocarUnidadeController,
  consultarAlocacaoController,
  cadastrarIntegracaoInversorController,
  excluirIntegracaoInversorController,
  listarIntegracoesInversoresController,
} from "./usinas.controller";
import { exigirAutenticacao, exigirGestor } from "../../middlewares/auth.middleware";
import { exigirUsinaDaSessaoOuGestor } from "../../utils/empresaScope";
import { exigirCapacidadeDoPlano } from "../../middlewares/limitesPlano.middleware";
import { empresaIdDaRequisicao } from "../../utils/empresaScope";
import { cadastrarUnidadeOperacional } from "./unidadeOperacional.service";
import { consultarClimaDoEndereco } from "./clima.service";
import { supabase } from "../../config/supabase";
import { obterSaldoAncora } from "./saldoAncora.service";
import { apiRateLimit } from "../../config/distributedRateLimit";
import { prepararPlanilhaRateio, enviarPlanilhaAoGerador } from "./rateioMensal.service";
import { permissaoComercial } from "../comercial/permissoesComerciais";
import {notificarRateioGerado,obterConfiguracaoRateio,salvarConfiguracaoRateio,buscarRateioAutomatico} from "./rateioAutomatico.service";

const router = Router();

function acessoOperacao(usuario:any) {
  const papel=String(usuario?.papel_empresa??"");
  return !((papel==="COLABORADOR_GERADOR"&&usuario?.permissoes?.operacao!==true)||(papel==="COLABORADOR_COMERCIAL"&&!permissaoComercial(usuario,"gerador_operacao")));
}

router.use(exigirAutenticacao);
router.post("/:id/unidades", exigirGestor, async (req, res) => {
  if (String((req as any).usuario?.papel_empresa ?? "").startsWith("COLABORADOR_") && (req as any).usuario?.permissoes?.unidades === false) {
    return res.status(403).json({ message: "Seu acesso às unidades não foi liberado pelo titular." });
  }
  try { return res.status(201).json(await cadastrarUnidadeOperacional(req.params.id, req.body, empresaIdDaRequisicao(req))); }
  catch (error: any) { return res.status(400).json({ message: error.message }); }
});

router.get("/", exigirGestor, listarUsinasController);
router.post("/importar-producao-pdf", exigirGestor, upload.single("arquivo"), importarProducaoPelaUcController);

router.get("/:id", exigirUsinaDaSessaoOuGestor(), buscarUsinaController);
router.get("/:id/clima", exigirUsinaDaSessaoOuGestor(), apiRateLimit("usinas-routes-10", { windowMs: 60_000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false }), async (req, res) => {
  try {
    const { data, error } = await supabase.from("usinas").select("endereco")
      .eq("id", req.params.id).eq("empresa_id", empresaIdDaRequisicao(req)).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Usina não encontrada." });
    res.setHeader("Cache-Control", "private, no-store");
    return res.json(await consultarClimaDoEndereco(data.endereco));
  } catch { return res.status(503).json({ disponivel: false, motivo: "Clima temporariamente indisponível." }); }
});

router.get("/:id/dashboard", exigirUsinaDaSessaoOuGestor(), dashboardUsinaController);
router.get("/:id/alocacao", exigirGestor, consultarAlocacaoController);
router.get("/:id/rateio-configuracao",exigirGestor,async(req,res)=>{
  if(!acessoOperacao((req as any).usuario))return res.status(403).json({message:"Acesso à operação não autorizado."});
  try{return res.json(await obterConfiguracaoRateio(req.params.id,empresaIdDaRequisicao(req)));}catch{return res.status(503).json({message:"Configuração do rateio automático indisponível. Tente novamente."});}
});
router.get("/:id/saldo-ancora",exigirGestor,async(req,res)=>{
  if(!acessoOperacao((req as any).usuario))return res.status(403).json({message:"Acesso à operação não autorizado."});
  res.setHeader("Cache-Control","private, no-store");
  try{return res.json(await obterSaldoAncora(req.params.id,empresaIdDaRequisicao(req),String(req.query.uc??""),String(req.query.competencia??"")));}
  catch{return res.status(503).json({message:"Não foi possível consultar o saldo da âncora."});}
});
router.put("/:id/rateio-configuracao",exigirGestor,async(req,res)=>{
  if(!acessoOperacao((req as any).usuario))return res.status(403).json({message:"Acesso à operação não autorizado."});
  try{return res.json(await salvarConfiguracaoRateio(req.params.id,empresaIdDaRequisicao(req),req.body));}catch(error:any){return res.status(400).json({message:error.message});}
});
router.get("/:id/rateios-mensais/:competencia",exigirGestor,async(req,res)=>{
  if(!acessoOperacao((req as any).usuario))return res.status(403).json({message:"Acesso à operação não autorizado."});
  try{return res.json(await buscarRateioAutomatico(req.params.id,empresaIdDaRequisicao(req),req.params.competencia));}catch(error:any){return res.status(400).json({message:error.message});}
});
router.post("/:id/rateio-mensal", exigirGestor, apiRateLimit("usinas-routes-11", { windowMs: 60_000, limit: 5 }), async (req, res) => {
  const usuario = (req as any).usuario;
  const papel = String(usuario?.papel_empresa ?? "");
  if ((papel === "COLABORADOR_GERADOR" && usuario?.permissoes?.operacao !== true)
    || (papel === "COLABORADOR_COMERCIAL" && !permissaoComercial(usuario,"gerador_operacao"))) {
    return res.status(403).json({message:"Seu acesso à operação não foi liberado pelo titular."});
  }
  try {
    const empresaId = empresaIdDaRequisicao(req);
    const plano = await prepararPlanilhaRateio(req.params.id,empresaId,String(req.body?.competencia ?? ""),String(req.body?.ucAncora ?? ""),String(req.body?.documentoAncora ?? ""),req.body?.numerosAtuaisConfirmados === true,req.body?.formatoCemig === true);
    await notificarRateioGerado(req.params.id,empresaId,plano).catch(()=>console.error("Não foi possível notificar o rateio manual."));
    res.setHeader("Cache-Control","private, no-store");
    const email = req.body?.enviarEmail === true ? await enviarPlanilhaAoGerador(req.params.id,empresaId,plano,usuario) : {enviado:false};
    return res.json({...plano,emailEnviado:email.enviado});
  } catch (error: any) { return res.status(400).json({message:error.message}); }
});

router.get("/:id/inversores", exigirAutenticacao, exigirGestor, listarIntegracoesInversoresController);
router.post("/:id/inversores", exigirAutenticacao, exigirGestor, cadastrarIntegracaoInversorController);
router.delete("/:id/inversores/:integracaoId", exigirAutenticacao, exigirGestor, excluirIntegracaoInversorController);

router.post("/:id/importar-fatura", exigirGestor, upload.single("arquivo"), importarFaturaGeradoraController);
router.post("/:id/alocar-unidade", exigirGestor, alocarUnidadeController);
router.post("/:id/migrar-unidades", exigirGestor, migrarUnidadesDaUsinaController);

router.post("/", exigirGestor, exigirCapacidadeDoPlano("usinas"), criarUsinaController);

router.put("/:id", exigirGestor, atualizarUsinaController);

router.delete("/:id", exigirGestor, excluirUsinaController);

export default router;
