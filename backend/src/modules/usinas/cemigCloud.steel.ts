import {randomUUID} from 'node:crypto';
import {CEMIG_SESSION_SECONDS,exigirCemigSimulacao} from './cemigCloud.policy';

export function steelPreviewHabilitado(env:NodeJS.ProcessEnv) {
 try{exigirCemigSimulacao(env);}catch{return false;}
 return env.CEMIG_STEEL_FALLBACK_ENABLED==='true'&&env.STEEL_TRIAL_ONLY_CONFIRMED==='true'&&Boolean(env.STEEL_API_KEY?.trim());
}

export function conferirLiveSteel(valor:unknown) {
 const u=new URL(String(valor));
 if(u.protocol!=='https:'||u.username||u.password||!(u.hostname==='steel.dev'||u.hostname.endsWith('.steel.dev'))||
  [...u.searchParams.keys()].some(k=>/^api[-_]?key$/i.test(k)))throw new Error('Visualizador Steel inválido.');
 return u.toString();
}

/** No purchases, proxies, CAPTCHA solving or persistent browser profiles. */
export async function criarSteelPreview(opcoes:{env?:NodeJS.ProcessEnv;fetcher?:typeof fetch}={}) {
 const env=opcoes.env??process.env;
 if(!steelPreviewHabilitado(env))throw new Error('O reserva Steel exige crédito de teste confirmado, sem cartão nem recarga.');
 const fetcher=opcoes.fetcher??fetch;
 const id=randomUUID();
 const api=async(path:string,body?:object)=>{
  const r=await fetcher(`https://api.steel.dev/v1/sessions${path?`/${path}`:''}`,{method:'POST',redirect:'error',
   signal:AbortSignal.timeout(15000),headers:{'steel-api-key':env.STEEL_API_KEY!,'Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok)throw new Error('Operação Steel não confirmada. Nenhuma sessão será recriada automaticamente.');
  return r;
 };
 const liberar=async()=>{await api(`${id}/release`);};
 try {
  // A preassigned ID allows cleanup even if create succeeds but its response is lost.
  const response=await api('',{sessionId:id,timeout:CEMIG_SESSION_SECONDS*1000,useProxy:false,solveCaptcha:false,
   persistProfile:false,headless:false,debugConfig:{interactive:true},dimensions:{width:1280,height:900}});
  const session=await response.json();
  if(session.id!==id||session.status!=='live')throw new Error('Sessão Steel não confirmada.');
  const liveUrl=conferirLiveSteel(session.debugUrl);
  const connect=new URL('wss://connect.steel.dev');
  connect.searchParams.set('apiKey',env.STEEL_API_KEY!);connect.searchParams.set('sessionId',id);
  return {id,connectUrl:connect.toString(),liveUrl,liberar};
 }catch{
  await liberar().catch(()=>{});
  throw new Error('Não foi possível abrir o Steel. A sessão não será repetida automaticamente.');
 }
}
