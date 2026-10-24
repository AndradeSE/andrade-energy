exports.handler=async()=>{
 const {exigirCemigSimulacao}=require('../../dist/modules/usinas/cemigCloud.policy.js');
 try{exigirCemigSimulacao(process.env);}catch{return {statusCode:200};}
 await require('../../dist/modules/cotas/browserbaseQuota.js').coletarCotaBrowserbase();
 const secret=process.env.CONTINGENCY_WORKER_SECRET;
 if(!secret||secret.length<32)throw new Error('Worker de simulação não configurado.');
 const {supabase}=require('../../dist/config/supabase.js');
 const r=await supabase.from('cemig_simulacoes').select('id').eq('estado','FILA').gt('expira_em',new Date().toISOString()).order('criado_em').limit(1).maybeSingle();
 if(r.error)throw new Error('Fila indisponível.');
 if(!r.data)return {statusCode:200};
 const response=await fetch('https://andrade-energy-fallback-probe.netlify.app/.netlify/functions/cemig-background',{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json','x-cemig-worker':secret},body:JSON.stringify({id:r.data.id})});
 if(response.status!==202)throw new Error('Worker não aceitou a simulação.');
 return {statusCode:200};
};
