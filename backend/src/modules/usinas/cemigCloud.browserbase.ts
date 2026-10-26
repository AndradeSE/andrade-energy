import {CEMIG_SESSION_SECONDS,conferirMinutosGratuitos,urlLivePermitida} from "./cemigCloud.policy";

export class FalhaConsultaBrowserbase extends Error {
 constructor(status:number){
  super(status===401?'O Browserbase recusou a chave configurada. Confira a credencial no Render.':
   status===403?'A chave não tem acesso ao projeto configurado. Confira se ambos pertencem à mesma conta.':
   status===404?'O projeto configurado não foi encontrado para esta chave. Confira o Project ID.':
   status===429?'O Browserbase limitou temporariamente as consultas. Aguarde antes de atualizar.':
   'A consulta ao Browserbase está indisponível. Tente novamente mais tarde.');
 }
}

async function api(path:string,method="GET",body?:object) {
  const key=process.env.BROWSERBASE_API_KEY?.trim();
  if(!key||process.env.BROWSERBASE_FREE_PLAN_CONFIRMED!=="true")throw new Error("Configure o navegador gratuito em nuvem.");
  const r=await fetch(`https://api.browserbase.com/v1/${path}`,{method,redirect:"error",signal:AbortSignal.timeout(15000),headers:{"X-BB-API-Key":key,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok)throw new FalhaConsultaBrowserbase(r.status);
  return r.json();
}
export async function criarBrowserbaseSimulacao() {
  const projectId=process.env.BROWSERBASE_PROJECT_ID?.trim();
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
  return selecionarLiveCemig(result,pageUrl);
}
export function selecionarLiveCemig(result:{pages?:unknown},pageUrl?:string) {
  const permitida=(value:unknown)=>{
    try {const u=new URL(String(value));return !u.username&&!u.password&&
      ['https://www.atendimento.cemig.com.br','https://atende.cemig.com.br'].includes(u.origin);}
    catch{return false;}
  };
  const paginas=Array.isArray(result.pages)?result.pages.filter((p:any)=>p&&permitida(p.url)):[];
  const exata=paginas.find((p:any)=>p.url===pageUrl);
  // A redirect/new login tab must not silently fall back to a blank session tab.
  const pagina=exata??(paginas.length===1?paginas[0]:undefined);
  if(!pagina)throw new Error('Não foi possível identificar a aba da Cemig. Nenhum protocolo foi solicitado.');
  return urlLivePermitida(pagina.debuggerFullscreenUrl);
}
export async function consultarMinutosBrowserbase(){
 const projectId=process.env.BROWSERBASE_PROJECT_ID?.trim();
 if(!projectId||!/^[a-zA-Z0-9-]{8,80}$/.test(projectId))throw new Error('Projeto não configurado.');
 const uso=await api(`projects/${projectId}/usage`);
 if(typeof uso.browserMinutes!=='number'||!Number.isFinite(uso.browserMinutes)||uso.browserMinutes<0)throw new Error('Leitura indisponível.');
 return uso.browserMinutes as number;
}
export async function encerrarBrowserbase(id:string) {
  await api(`sessions/${id}`,"POST",{projectId:process.env.BROWSERBASE_PROJECT_ID,status:"REQUEST_RELEASE"});
}
