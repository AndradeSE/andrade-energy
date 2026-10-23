exports.handler = async () => {
  if (process.env.NETLIFY_DURABLE_JOBS_ENABLED !== "true") return {statusCode:200};
  process.env.API_RUNTIME = "serverless";
  process.env.BACKGROUND_JOBS_ENABLED = "false";
  const { contingencyEnvironment } = require("../../dist/config/contingencyRuntime.js");
  if (!contingencyEnvironment(process.env)) throw new Error("Ambiente do worker inválido.");
  const { supabase } = require("../../dist/config/supabase.js");
  const state=await supabase.from("contingencia_controle").select("executor").eq("id",true).single();
  if(state.error) throw new Error("Controle de execução indisponível.");
  if(state.data.executor!=="NETLIFY") return {statusCode:200};
  const secret=process.env.CONTINGENCY_WORKER_SECRET;
  const base=process.env.URL;
  if(!secret || secret.length<32 || !base || !/^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(base)) {
    throw new Error("Worker não configurado.");
  }
  const { scheduledJobs }=require("../../dist/config/scheduledJobs.js");
  const results=await Promise.allSettled(Object.keys(scheduledJobs).map(async job=>{
    const response=await fetch(`${base}/.netlify/functions/jobs-background`,{
      method:"POST",headers:{"Content-Type":"application/json","x-contingency-worker":secret},
      body:JSON.stringify({job}),signal:AbortSignal.timeout(8000),redirect:"error",
    });
    if(response.status!==202) throw new Error("Worker não aceitou a tarefa.");
  }));
  if(results.some(result=>result.status==="rejected")) throw new Error("Falha ao despachar tarefas.");
  return {statusCode:200};
};
