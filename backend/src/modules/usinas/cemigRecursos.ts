import type {Page,Request,Response} from 'playwright-core';

const recursos={
 '/Content/css':'CSS_PRINCIPAL',
 '/Selectize/css':'CSS_SELECTIZE',
 '/bundles/jquery':'JS_JQUERY',
 '/bundles/bootstrap':'JS_BOOTSTRAP',
 '/bundles/application':'JS_APLICACAO',
} as const;
type Recurso=typeof recursos[keyof typeof recursos];

/** Only fixed public asset names leave this collector. Never URLs or query data. */
export function recursoPublicoCemig(url:string):Recurso|null{
 try{
  const u=new URL(url);
  if(u.origin!=='https://atende.cemig.com.br')return null;
  return recursos[u.pathname as keyof typeof recursos]??null;
 }catch{return null;}
}
export function resultadoRecursoCemig(tipo:Recurso,status:number,contentType:string|null){
 if(!Number.isInteger(status)||status<100||status>599)return 'HTTP_INVALIDO';
 if(status>=300&&status<400)return null;
 if(status<200||status>=300)return `HTTP_${status}`;
 const mime=(contentType??'').split(';')[0].trim().toLowerCase();
 if(!mime)return 'MIME_AUSENTE';
 return (tipo.startsWith('CSS_')?mime==='text/css':
  ['text/javascript','application/javascript','application/x-javascript'].includes(mime))?'OK':
  mime==='text/html'?'HTML_EM_VEZ_DO_RECURSO':'MIME_INCOMPATIVEL';
}
export function falhaRedeRecursoCemig(message:string){
 // Use an allowlist: request failure messages can otherwise contain private URLs.
 const codigo=message.match(/net::(ERR_[A-Z_]+)/)?.[1];
 return codigo&&['ERR_ABORTED','ERR_FAILED','ERR_CONNECTION_RESET','ERR_CONNECTION_CLOSED',
  'ERR_CONNECTION_REFUSED','ERR_TIMED_OUT','ERR_NAME_NOT_RESOLVED','ERR_CERT_AUTHORITY_INVALID',
  'ERR_CERT_DATE_INVALID','ERR_CERT_COMMON_NAME_INVALID','ERR_BLOCKED_BY_CLIENT',
  'ERR_HTTP_RESPONSE_CODE_FAILURE','ERR_SSL_PROTOCOL_ERROR'].includes(codigo)?codigo:'FALHA_REDE';
}
export function acompanharRecursosCemig(page:Page){
 const resultados=new Map<Recurso,string>();const pending=new Set<Promise<void>>();
 const falhas=new Map<Recurso,string>();
 const versoes=new Map<Recurso,number>();
 const response=(r:Response)=>{
  const tipo=recursoPublicoCemig(r.url());if(!tipo)return;
  const versao=(versoes.get(tipo)??0)+1;versoes.set(tipo,versao);
  falhas.delete(tipo);
  const status=r.status();
  const http=Number.isInteger(status)&&status>=100&&status<=599?`HTTP_${status}`:'HTTP_INVALIDO';
  resultados.set(tipo,http);
  const task=(async()=>{
   try{
    const resultado=resultadoRecursoCemig(tipo,status,await r.headerValue('content-type'));
    if(resultado&&versoes.get(tipo)===versao)resultados.set(tipo,resultado.startsWith('HTTP_')?resultado:`${http}/${resultado}`);
   }catch{if(versoes.get(tipo)===versao)resultados.set(tipo,`${http}/LEITURA_INDISPONIVEL`);}
  })();
  pending.add(task);void task.finally(()=>pending.delete(task));
 };
 const failed=(r:Request)=>{
  const tipo=recursoPublicoCemig(r.url());
  if(tipo)falhas.set(tipo,falhaRedeRecursoCemig(r.failure()?.errorText??''));
 };
 page.on('response',response);page.on('requestfailed',failed);
 return {
  resumo:async()=>{
   await Promise.allSettled([...pending]);
   return Object.values(recursos).map(tipo=>`${tipo}: ${resultados.get(tipo)??'SEM_RESPOSTA'}${falhas.has(tipo)?` / ${falhas.get(tipo)}`:''}`).join('; ');
  },
  parar:()=>{page.off('response',response);page.off('requestfailed',failed);},
 };
}
