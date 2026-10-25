import {contingencyEnvironment, executorApiOrigin} from './contingencyRuntime';

export const CASCADE_RENDER_SERVICES = {
  preview: {primary:'srv-das0mmfpn0mc73ec00hg',reserve:'srv-dbee79i9lscs73ase56g'},
  production: {primary:'srv-da0iso5bedkc73asecig',reserve:'srv-dbejmn5g1s2s73fqn6m0'},
} as const;
type State='ATIVO'|'BILLING'|'OUTRA_SUSPENSAO'|'INDETERMINADO';
export function classifyCascadeService(body:any, environment:'preview'|'production', role:'primary'|'reserve'):State {
  if(body?.id!==CASCADE_RENDER_SERVICES[environment][role] || body?.type!=='web_service' ||
    body?.serviceDetails?.url!==executorApiOrigin(environment,role==='primary'?'RENDER':'RENDER_RESERVA') ||
    body?.serviceDetails?.plan!=='free' || !Array.isArray(body?.suspenders)) return 'INDETERMINADO';
  if(body.suspended==='not_suspended' && body.suspenders.length===0)return 'ATIVO';
  if(body.suspended!=='suspended')return 'INDETERMINADO';
  return body.suspenders.length===1 && body.suspenders[0]==='billing'?'BILLING':'OUTRA_SUSPENSAO';
}

/** Runs only on Netlify's independent scheduler. Never infer suspension from an outage. */
export async function observeCascadeForContingency(env:NodeJS.ProcessEnv,store:any,request:typeof fetch=fetch) {
  const environment=contingencyEnvironment(env);
  if(!environment || env.NETLIFY_DURABLE_JOBS_ENABLED!=='true' || env.CONTINGENCY_CASCADE_ENABLED!=='true')return;
  const {data,error}=await store.from('contingencia_automacao').select('ativa,cascata_ativa,render_service_id').eq('id',true).single();
  if(error)throw new Error('Controle da cascata indisponível.');
  if(!data?.ativa || !data.cascata_ativa)return;
  if(data.render_service_id!==CASCADE_RENDER_SERVICES[environment].primary)throw new Error('Ambiente da cascata divergente.');
  const read=async(role:'primary'|'reserve'):Promise<State>=>{
    const key=String(role==='primary'?env.RENDER_MONITOR_API_KEY??'':env.RENDER_RESERVE_MONITOR_API_KEY??'').trim();
    if(!key)return 'INDETERMINADO';
    try {
      const response=await request(`https://api.render.com/v1/services/${CASCADE_RENDER_SERVICES[environment][role]}`,{
        headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(6000),
      });
      return response.ok?classifyCascadeService(await response.json(),environment,role):'INDETERMINADO';
    }catch{return 'INDETERMINADO';}
  };
  const [primary,reserve]=await Promise.all([read('primary'),read('reserve')]);
  const result=await store.rpc('observar_cascata_contingencia',{
    p_principal:CASCADE_RENDER_SERVICES[environment].primary,p_reserva:CASCADE_RENDER_SERVICES[environment].reserve,
    p_estado_principal:primary,p_estado_reserva:reserve,p_commit:env.COMMIT_REF??null,
  });
  if(result.error)throw new Error('Não foi possível registrar a observação da cascata.');
  return result.data;
}
