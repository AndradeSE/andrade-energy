import {Router} from "express";
import {exigirAutenticacao,exigirSuperAdministradorAndrade} from "../middlewares/auth.middleware";
import {supabase} from "./supabase";
import {apiRateLimit} from "./distributedRateLimit";
import {contingencyExecutor,renderReserveEnvironment} from './contingencyExecutor';
import {renderReserveReady,RENDER_RESERVE_PREVIEW_ORIGIN,RENDER_RESERVE_PRODUCTION_ORIGIN} from './renderReserveReadiness';

const router=Router();
// Public routing metadata only: no users, secrets, jobs, or financial data.
router.get('/estado',async(_req,res)=>{
  res.setHeader('Cache-Control','no-store');
  try {
    if(contingencyExecutor(process.env)!=='RENDER_RESERVA') return res.status(404).json({message:'Indisponível.'});
    const {data,error}=await supabase.from('contingencia_controle')
      .select('executor,revisao,render_reserva_commit_validado,render_reserva_validado_em').eq('id',true).single();
    if(error || !data) throw new Error('unavailable');
    return res.json({environment:renderReserveEnvironment(process.env),executor:data.executor,revision:data.revisao,
      contingency:{readyForFailover:renderReserveReady(process.env,data)}});
  } catch { return res.status(503).json({message:'Não foi possível conferir o servidor ativo.'}); }
});
router.use(exigirAutenticacao,exigirSuperAdministradorAndrade,(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
router.post('/preparar-render',apiRateLimit('contingency-destination',{windowMs:60_000,limit:3}),async(req,res)=>{
  if(contingencyExecutor(process.env)!=='RENDER_RESERVA' || req.body?.confirmacao!=='PREPARAR_RESERVA_RENDER' || !Number.isSafeInteger(req.body?.revisao))
    return res.status(400).json({message:'Confirme a preparação do servidor reserva.'});
  try {
    const {data,error}=await supabase.from('contingencia_controle').select('*').eq('id',true).single();
    if(error || !renderReserveReady(process.env,data)) return res.status(409).json({message:'Versão do reserva ainda não validada.'});
    const result=await supabase.rpc('configurar_destino_reserva_render',{p_usuario:(req as any).usuario.id,p_revisao:req.body.revisao});
    if(result.error) return res.status(409).json({message:'Estado alterado. Atualize a conferência.'});
    return res.json({destino:'RENDER_RESERVA'});
  } catch { return res.status(503).json({message:'Não foi possível preparar o destino.'}); }
});
router.get('/',async(_req,res)=>{
  try {
    const [control,jobs,requests,automation]=await Promise.all([
      supabase.from('contingencia_controle').select('*').eq('id',true).single(),
      supabase.from('contingencia_trabalhos').select('nome,estado,executor,lease_ate,atualizado_em').order('nome'),
      supabase.from('contingencia_requisicoes').select('id,executor,namespace,iniciado_em').order('iniciado_em').limit(100),
      supabase.from('contingencia_automacao').select('ativa,ultimo_estado,ultima_consulta,ultimo_resultado').eq('id',true).single(),
    ]);
    if(control.error || jobs.error || requests.error || automation.error) throw new Error('unavailable');
    return res.json({control:control.data,jobs:jobs.data,requests:requests.data,automation:{...automation.data,configurada:Boolean(process.env.RENDER_MONITOR_API_KEY)}});
  } catch {return res.status(503).json({message:'Não foi possível conferir o backend reserva.'});}
});
router.post('/automacao',apiRateLimit('contingency-automation',{windowMs:60_000,limit:3}),async(req,res)=>{
  const active=req.body?.ativa;
  if(typeof active!=='boolean' || req.body?.confirmacao!==(active?'AUTOMATIZAR_BILLING':'DESATIVAR_AUTOMACAO')) {
    return res.status(400).json({message:'Confirme a política de suspensão por cobrança.'});
  }
  if(active&&!process.env.RENDER_MONITOR_API_KEY) return res.status(409).json({message:'A consulta do Render ainda não está conectada no servidor reserva.'});
  const preview=/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(process.env.SUPABASE_URL??'');
  const result=await supabase.rpc('configurar_contingencia_automatica',{p_usuario:(req as any).usuario.id,p_ativa:active,
    p_servico:preview?'srv-das0mmfpn0mc73ec00hg':'srv-da0iso5bedkc73asecig'});
  if(result.error) return res.status(409).json({message:'Não foi possível alterar a automação. Consulte novamente antes de tentar.'});
  return res.json({ativa:active});
});
router.post('/trocar',apiRateLimit('contingency-switch',{windowMs:60_000,limit:3}),async(req,res)=>{
  const target=req.body?.executor;
  const confirmation=req.body?.confirmacao;
  const preview=/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(process.env.SUPABASE_URL??'');
  if(!['RENDER','NETLIFY',...((preview || process.env.RENDER_RESERVE_PRODUCTION_ENABLED==='true')?['RENDER_RESERVA']:[])].includes(target) || !Number.isSafeInteger(req.body?.revisao) ||
    confirmation!==(target!=='RENDER'?'COTA_RENDER_ESGOTADA':'RENDER_RECUPERADO')) {
    return res.status(400).json({message:'Confirme explicitamente o motivo da troca e a revisão atual.'});
  }
  try {
    // Check the standby's deployed release, not merely an old readiness record.
    if(target!=='RENDER') {
      const origin=target==='RENDER_RESERVA'?(preview?RENDER_RESERVE_PREVIEW_ORIGIN:RENDER_RESERVE_PRODUCTION_ORIGIN):
        preview?'https://andrade-energy-fallback-probe.netlify.app':'https://andrade-energy-api-reserva.netlify.app';
      const health=await fetch(`${origin}/health`,{signal:AbortSignal.timeout(8000),redirect:'error'});
      const body=health.ok?await health.json() as any:null;
      if(!body || body.environment!==(preview?'preview':'production') || body.contingency?.readyForFailover!==true || body.contingency?.backgroundJobs!==true ||
        (target==='RENDER_RESERVA' && body.contingency?.executor!=='RENDER_RESERVA')) {
        return res.status(409).json({message:'O reserva ainda não passou pela conferência da versão publicada e dos agendadores.'});
      }
    }
    const changed=await supabase.rpc('trocar_executor_contingencia',{p_usuario:(req as any).usuario.id,
      p_executor:target,p_revisao:req.body.revisao,p_confirmacao:confirmation});
    if(changed.error) return res.status(409).json({message:'Troca não realizada. Atualize a conferência: pode haver operações em execução, pendências de revisão ou versão não validada.'});
    return res.json({executor:target,revision:changed.data});
  } catch {return res.status(503).json({message:'Não foi possível conferir a troca. Consulte o estado antes de tentar novamente.'});}
});
export default router;
