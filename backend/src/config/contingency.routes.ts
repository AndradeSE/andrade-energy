import {Router} from "express";
import {exigirAutenticacao,exigirSuperAdministradorAndrade} from "../middlewares/auth.middleware";
import {supabase} from "./supabase";
import {apiRateLimit} from "./distributedRateLimit";

const router=Router();
router.use(exigirAutenticacao,exigirSuperAdministradorAndrade,(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
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
  if(!['RENDER','NETLIFY'].includes(target) || !Number.isSafeInteger(req.body?.revisao) ||
    confirmation!==(target==='NETLIFY'?'COTA_RENDER_ESGOTADA':'RENDER_RECUPERADO')) {
    return res.status(400).json({message:'Confirme explicitamente o motivo da troca e a revisão atual.'});
  }
  try {
    // Check the standby's deployed release, not merely an old readiness record.
    if(target==='NETLIFY') {
      const preview=/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(process.env.SUPABASE_URL??'');
      const origin=preview?'https://andrade-energy-fallback-probe.netlify.app':'https://andrade-energy-api-reserva.netlify.app';
      const health=await fetch(`${origin}/health`,{signal:AbortSignal.timeout(8000),redirect:'error'});
      const body=health.ok?await health.json() as any:null;
      if(!body || body.environment!==(preview?'preview':'production') || body.contingency?.readyForFailover!==true || body.contingency?.backgroundJobs!==true) {
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
