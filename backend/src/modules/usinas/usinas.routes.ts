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
import {cadastroAncoras,FalhaCadastroAncora} from './ucsAncoras.service';
import cemigNativeRouter from './cemigNative.routes';

const router = Router();
import { consultarTributosCemig } from './tributosCemig.service';

function acessoOperacao(usuario:any) {
  const papel=String(usuario?.papel_empresa??"");
  return !((papel==="COLABORADOR_GERADOR"&&usuario?.permissoes?.operacao!==true)||(papel==="COLABORADOR_COMERCIAL"&&!permissaoComercial(usuario,"gerador_operacao")));
}

router.use(exigirAutenticacao);
router.get('/tributos-cemig',async(req,res)=>{
 const referencia=String(req.query.referencia??new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}).slice(0,7));
 if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(referencia))return res.status(400).json({message:'Competência inválida.'});
 try{return res.json(await consultarTributosCemig(referencia));}
 catch{return res.status(502).json({message:'Não foi possível obter os impostos da Cemig. Nenhuma alíquota foi presumida.'});}
});
router.get('/tarifas-cemig',async(_req,res)=>{
 try{
  const resposta=await fetch('https://www.cemig.com.br/valores-e-tarifas/tarifas-vigentes/',{signal:AbortSignal.timeout(15000)});
  if(!resposta.ok)throw new Error('Fonte indisponível');
  const html=await resposta.text();
  res.setHeader('Cache-Control','private, max-age=300');
  return res.json({html,fonte:'https://www.cemig.com.br/valores-e-tarifas/tarifas-vigentes/',consultadoEm:new Date().toISOString()});
 }catch{return res.status(502).json({message:'A Cemig não respondeu à consulta de tarifas. Tente novamente ou informe manualmente.'});}
});
router.use(cemigNativeRouter);
for(const metodo of ['get','post','put','delete'] as const){
 const rota=metodo==='put'||metodo==='delete'?'/:id/ucs-ancoras/:ancoraId':'/:id/ucs-ancoras';
 router[metodo](rota,exigirGestor,async(req,res)=>{
  if(!acessoOperacao((req as any).usuario))return res.status(403).json({message:'Acesso à operação não autorizado.'});
  res.setHeader('Cache-Control','private, no-store');
  try{
   const empresa=empresaIdDaRequisicao(req);
   if(metodo==='get')return res.json(await cadastroAncoras.listar(req.params.id,empresa));
   if(metodo==='delete')return res.json(await cadastroAncoras.excluir(req.params.id,empresa,req.params.ancoraId));
   return res.status(metodo==='post'?201:200).json(await cadastroAncoras.salvar(req.params.id,empresa,req.body,metodo==='put'?req.params.ancoraId:undefined));
  }catch(error){return res.status(error instanceof FalhaCadastroAncora?400:503).json({message:error instanceof FalhaCadastroAncora?error.message:'Não foi possível acessar a lista de UCs âncora. Tente novamente.'});}
 });
}
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
router.post("/:id/rateio-simulacao", exigirGestor, apiRateLimit("rateio-simulacao", { windowMs: 60_000, limit: 5 }), async (req, res) => {
  if (!acessoOperacao((req as any).usuario)) return res.status(403).json({ message: "Acesso à operação não autorizado." });
  res.setHeader("Cache-Control", "private, no-store");
  try {
    // Deliberately read-only: no notification, email, configuration or monthly job writes.
    const plano = await prepararPlanilhaRateio(req.params.id, empresaIdDaRequisicao(req), String(req.body?.competencia ?? ""), String(req.body?.ucAncora ?? ""), "", req.body?.numerosAtuaisConfirmados === true, req.body?.formatoCemig === true);
    return res.json({ ...plano, simulacao: true, emailEnviado: false, protocolado: false });
  } catch (error: any) { return res.status(400).json({ message: error.message }); }
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
    const email = req.body?.enviarEmail === true ? await enviarPlanilhaAoGerador(req.params.id,empresaId,plano,usuario).catch(()=>({enviado:false})) : {enviado:false};
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
