import {criarBrowserbaseSimulacao,encerrarBrowserbase,liveBrowserbase} from './cemigCloud.browserbase';
import {CotaBrowserbaseInsuficiente} from './cemigCloud.policy';
import {criarSteelPreview,steelPreviewHabilitado} from './cemigCloud.steel';

type Dependencias={criarPrincipal:()=>Promise<{id:string;connectUrl:string}>;liberarPrincipal:(id:string)=>Promise<void>;
 livePrincipal:(id:string,url?:string)=>Promise<string>;criarReserva:()=>Promise<{id:string;connectUrl:string;liveUrl:string;liberar:()=>Promise<void>}>;
 reservaHabilitada:()=>boolean};
export async function abrirNavegadorCemig(autorizaSteel:boolean,deps:Dependencias={
 criarPrincipal:criarBrowserbaseSimulacao,liberarPrincipal:encerrarBrowserbase,livePrincipal:liveBrowserbase,
 criarReserva:criarSteelPreview,reservaHabilitada:()=>steelPreviewHabilitado(process.env),
},preferencia:'BROWSERBASE'|'STEEL'='BROWSERBASE') {
 // An explicit Preview diagnostic run can select the already configured provider.
 // Never retry another browser after a session has been created.
 if(preferencia==='STEEL'){
  if(!autorizaSteel||!deps.reservaHabilitada())throw new Error('Steel exige autorização e crédito de teste confirmado no Preview.');
  const reserva=await deps.criarReserva();
  return {...reserva,provedor:'STEEL' as const,live:async(_pageUrl:string)=>reserva.liveUrl};
 }
 let principal:{id:string;connectUrl:string};
 try{principal=await deps.criarPrincipal();}
 catch(error){
  // Only confirmed insufficient quota, before any principal session was requested.
  if(!(error instanceof CotaBrowserbaseInsuficiente)||!autorizaSteel||!deps.reservaHabilitada())throw error;
  const reserva=await deps.criarReserva();
  return {...reserva,provedor:'STEEL' as const,live:async(_pageUrl:string)=>reserva.liveUrl};
 }
 return {...principal,provedor:'BROWSERBASE' as const,live:(url:string)=>deps.livePrincipal(principal.id,url),
  liberar:()=>deps.liberarPrincipal(principal.id)};
}
