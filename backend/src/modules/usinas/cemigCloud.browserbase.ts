import {CEMIG_SESSION_SECONDS,conferirMinutosGratuitos,urlLivePermitida} from "./cemigCloud.policy";

async function api(path:string,method="GET",body?:object) {
  const key=process.env.BROWSERBASE_API_KEY;
  if(!key||process.env.BROWSERBASE_FREE_PLAN_CONFIRMED!=="true")throw new Error("Configure o navegador gratuito em nuvem.");
  const r=await fetch(`https://api.browserbase.com/v1/${path}`,{method,redirect:"error",signal:AbortSignal.timeout(15000),headers:{"X-BB-API-Key":key,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok)throw new Error("O navegador em nuvem recusou a operação. Confira a configuração e a cota.");
  return r.json();
}
export async function criarBrowserbaseSimulacao() {
  const projectId=process.env.BROWSERBASE_PROJECT_ID;
  if(!projectId||!/^[a-zA-Z0-9-]{8,80}$/.test(projectId))throw new Error("Projeto do navegador não configurado.");
  conferirMinutosGratuitos((await api(`projects/${projectId}/usage`)).browserMinutes);
  const s=await api("sessions","POST",{projectId,timeout:CEMIG_SESSION_SECONDS,keepAlive:false,proxies:false,browserSettings:{solveCaptchas:false,advancedStealth:false,recordSession:false,logSession:false,ignoreCertificateErrors:false,viewport:{width:1280,height:900}}});
  if(typeof s.id!=="string"||!/^[a-zA-Z0-9-]{8,80}$/.test(s.id)||typeof s.connectUrl!=="string")throw new Error("Resposta de sessão inválida.");
  const connect=new URL(s.connectUrl);
  if(connect.protocol!=="wss:"||!(connect.hostname==="browserbase.com"||connect.hostname.endsWith(".browserbase.com")))throw new Error("Conexão de navegador inválida.");
  return {id:s.id,connectUrl:s.connectUrl};
}
export async function liveBrowserbase(id:string,pageUrl?:string) {
  const result=await api(`sessions/${id}/debug?expiresIn=600`);
  // The session-level view may point at an empty tab after portal navigation.
  const pagina=Array.isArray(result.pages)?result.pages.find((p:any)=>p.url===pageUrl):undefined;
  return urlLivePermitida(pagina?.debuggerFullscreenUrl??result.debuggerFullscreenUrl);
}
export async function consultarMinutosBrowserbase(){
 const projectId=process.env.BROWSERBASE_PROJECT_ID;
 if(!projectId||!/^[a-zA-Z0-9-]{8,80}$/.test(projectId))throw new Error('Projeto não configurado.');
 const uso=await api(`projects/${projectId}/usage`);
 if(typeof uso.browserMinutes!=='number'||!Number.isFinite(uso.browserMinutes)||uso.browserMinutes<0)throw new Error('Leitura indisponível.');
 return uso.browserMinutes as number;
}
export async function encerrarBrowserbase(id:string) {
  await api(`sessions/${id}`,"POST",{projectId:process.env.BROWSERBASE_PROJECT_ID,status:"REQUEST_RELEASE"});
}
