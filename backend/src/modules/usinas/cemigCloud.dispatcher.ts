import {exigirCemigSimulacao} from './cemigCloud.policy';

export function cemigRenderHabilitado(env:NodeJS.ProcessEnv):boolean {
  try { exigirCemigSimulacao(env); } catch { return false; }
  return env.CEMIG_CLOUD_EXECUTOR==='RENDER' && env.API_RUNTIME!=='serverless' &&
    env.BACKGROUND_JOBS_ENABLED!=='false' && env.BROWSERBASE_FREE_PLAN_CONFIRMED==='true' &&
    Boolean(env.BROWSERBASE_API_KEY?.trim()) && /^[a-zA-Z0-9-]{8,80}$/.test(env.BROWSERBASE_PROJECT_ID??'');
}

/** One pending run per process; executarCemigSimulacao also claims atomically in SQL. */
export function criarDespachanteCemig(deps:{buscar:()=>Promise<string|null>;executar:(id:string)=>Promise<void>;falhou:()=>void}) {
  let ocupado=false;
  return async()=>{
    if(ocupado)return;
    ocupado=true;
    try {
      const id=await deps.buscar();
      if(id)await deps.executar(id);
    } catch { deps.falhou(); }
    finally { ocupado=false; }
  };
}

export async function iniciarDespachanteCemigRender() {
  if(!cemigRenderHabilitado(process.env))return;
  const {supabase}=await import('../../config/supabase.js');
  const {executarCemigSimulacao}=await import('./cemigCloud.service.js');
  const tick=criarDespachanteCemig({
    buscar:async()=>{
      const r=await supabase.from('cemig_simulacoes').select('id').eq('estado','FILA_RENDER')
        .gt('expira_em',new Date().toISOString()).order('criado_em').limit(1).maybeSingle();
      if(r.error)throw new Error('Fila indisponível');
      return r.data?.id??null;
    },
    executar:(id)=>executarCemigSimulacao(id,'FILA_RENDER'),
    falhou:()=>console.error('Falha no despachante Cemig Preview; nenhuma repetição de protocolo.'),
  });
  void tick();
  console.log('Despachante Cemig Preview ativo no Render; somente anexo sem protocolo.');
  setInterval(()=>void tick(),15_000).unref();
}
