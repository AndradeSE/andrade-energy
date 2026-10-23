import { createServerlessHandler, normalizeNetlifyEvent } from "./config/serverlessAdapter";
import { homologationConfigured, serverlessRequestAllowed } from "./config/serverlessPolicy";
import { contingencyEnvironment } from "./config/contingencyRuntime";
import {isProviderIngress,forwardProviderIngress,isOAuthIngress,forwardOAuthIngress} from './config/contingencyIngress';

// Fail closed until the isolated homologation deployment is configured.
let ready: Promise<ReturnType<typeof createServerlessHandler>> | undefined;
export async function handler(event: object, context: object) {
  const method = (event as { httpMethod?: string }).httpMethod;
  const fullEnvironment=contingencyEnvironment(process.env);
  const path=(event as { path?: string }).path ?? "";
  if (fullEnvironment && process.env.CONTINGENCY_ROUTING_ENABLED!=="true") {
    return {statusCode:503,body:JSON.stringify({error:"Controle de execução não configurado."})};
  }
  if(fullEnvironment && (isProviderIngress(method,path) || isOAuthIngress(method,path))) {
    try {
      const {supabase}=await import('./config/supabase.js');
      const state=await supabase.from('contingencia_controle').select('executor').eq('id',true).single();
      if(state.error)throw state.error;
      if(state.data.executor==='RENDER')return isOAuthIngress(method,path)
        ? await forwardOAuthIngress(event,fullEnvironment) : await forwardProviderIngress(event,fullEnvironment);
    } catch {return {statusCode:503,body:JSON.stringify({error:'Provedor: processamento não confirmado. Tente novamente pelo mecanismo de reenvio.'})};}
  }
  if(fullEnvironment && method==="GET" && ["/health","/contingency/runtime"].includes(path)) {
    try {
      const {supabase}=await import("./config/supabase.js");
      const state=await supabase.from("contingencia_controle").select("executor,revisao,commit_validado,validado_em").eq("id",true).single();
      if(state.error) throw state.error;
      const commit=process.env.COMMIT_REF??"local";
      return {statusCode:200,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"},
        body:JSON.stringify({status:"online",environment:fullEnvironment,commit:commit.slice(0,7),executor:state.data.executor,revision:state.data.revisao,
          contingency:{readyForFailover:state.data.commit_validado===commit && Boolean(state.data.validado_em),
            activationPolicy:"confirmed_render_quota_only",backgroundJobs:process.env.NETLIFY_DURABLE_JOBS_ENABLED==="true"}})};
    } catch {return {statusCode:503,body:JSON.stringify({error:"Controle indisponível."})};}
  }
  // Initial remote validation cannot mutate records or trigger payments/queues.
  if (!method || (!fullEnvironment && !serverlessRequestAllowed(method, path, process.env))) {
    return { statusCode: 503, body: JSON.stringify({ error: "Contingência em validação: operações de escrita indisponíveis." }) };
  }
  if (!fullEnvironment && !homologationConfigured(process.env)) {
    return { statusCode: 503, body: JSON.stringify({ error: "API de homologação não configurada." }) };
  }
  ready ??= (async () => {
    const { app, validarSchemaAntesDeIniciar } = await import("./server.js");
    await validarSchemaAntesDeIniciar();
    return createServerlessHandler(app);
  })();
  try {
    const normalized = normalizeNetlifyEvent(event);
    if (!normalized) return { statusCode: 503, body: JSON.stringify({ error: "Metadados de conexão indisponíveis." }) };
    return await (await ready)(normalized, context);
  } catch {
    ready = undefined;
    return { statusCode: 503, body: JSON.stringify({ error: "API temporariamente indisponível." }) };
  }
}
