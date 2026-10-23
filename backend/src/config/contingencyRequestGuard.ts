import {randomUUID} from "node:crypto";
import type {RequestHandler} from "express";
import {supabase} from "./supabase";
import {continueReservedRequest} from "./contingencyRequestLifecycle";

export const contingencyRequestGuard: RequestHandler = async(req,res,next)=>{
  if(process.env.CONTINGENCY_ROUTING_ENABLED!=="true") return next();
  if(!req.path.startsWith("/api/") || /^\/api\/contingencia(\/|$)/.test(req.path) ||
    /^\/api\/auth\/(login|logout|session)\/?$/.test(req.path)) return next();
  if(req.method==='OPTIONS') return next();
  // Some nominal reads refresh provider state or repair stored documents.
  // Route all API work through the owner rather than assume GET is read-only.
  const executor=process.env.API_RUNTIME==='serverless'?'NETLIFY':'RENDER';
  const id=randomUUID();
  const namespace='/'+req.path.split('/')[2];
  try {
    const claim=await supabase.rpc('iniciar_requisicao_contingencia',{p_id:id,p_executor:executor,p_namespace:namespace,p_commit:process.env.COMMIT_REF??null});
    if(claim.error || claim.data!==true) return res.status(503).json({code:'EXECUTOR_INATIVO',message:'Servidor em troca controlada. Atualize a tela antes de tentar novamente.'});
    await continueReservedRequest(res,async()=>{
      const finish=await supabase.rpc('finalizar_requisicao_contingencia',{p_id:id,p_executor:executor});
      if(finish.error) throw new Error('A requisição exige conferência para troca de servidor.');
    },next);
    return;
  } catch { return res.status(503).json({message:'Controle de execução indisponível. Nenhuma nova operação foi iniciada.'}); }
};
