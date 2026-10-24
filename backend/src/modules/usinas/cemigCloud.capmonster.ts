import type {Page} from 'playwright-core';
import {exigirCemigSimulacao} from './cemigCloud.policy';

export function capmonsterDisponivel(env:NodeJS.ProcessEnv) {
  try { exigirCemigSimulacao(env); } catch { return false; }
  return env.CEMIG_CLOUD_EXECUTOR==='RENDER' && env.CAPMONSTER_PREVIEW_ENABLED==='true' && Boolean(env.CAPMONSTER_API_KEY?.trim());
}
export function conferirPaginaCaptcha(valor:string) {
  const u=new URL(valor);
  if(!['https://atende.cemig.com.br','https://www.atendimento.cemig.com.br'].includes(u.origin)||u.username||u.password)
    throw new Error('Página fora da Cemig autorizada.');
  return u.origin+u.pathname;
}
type Desafio={websiteURL:string;websiteKey:string;userAgent:string;s?:string};
export async function lerDesafioCemig(page:Page):Promise<Desafio> {
  const websiteURL=conferirPaginaCaptcha(page.url());
  const dados=await page.evaluate(()=>{
    const frames=Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe[src]'));
    const urls=frames.map(f=>{try{return new URL(f.src);}catch{return null;}});
    const frame=urls.find(u=>u&&['www.google.com','www.recaptcha.net'].includes(u.hostname)&&u.pathname.includes('/recaptcha/enterprise/anchor'));
    const widget=document.querySelector<HTMLElement>('[data-sitekey]');
    return {key:frame?.searchParams.get('k')??'',s:widget?.dataset.s,userAgent:navigator.userAgent};
  });
  if(!/^[a-zA-Z0-9_-]{20,200}$/.test(dados.key)||dados.userAgent.length>1000||(dados.s?.length??0)>4000)
    throw new Error('Desafio Enterprise não identificado. Nenhum crédito utilizado.');
  return {websiteURL,websiteKey:dados.key,userAgent:dados.userAgent,...(dados.s?{s:dados.s}:{})};
}

/** Fixed API, no purchase endpoint, one createTask call and no retries on ambiguity. */
export async function obterRespostaCapmonster(desafio:Desafio,opcoes:{env:NodeJS.ProcessEnv;ativo:()=>Promise<boolean>;fetcher?:typeof fetch;esperar?:(ms:number)=>Promise<void>}) {
  if(!capmonsterDisponivel(opcoes.env))throw new Error('CapMonster indisponível neste ambiente.');
  const url=conferirPaginaCaptcha(desafio.websiteURL);
  if(!/^[a-zA-Z0-9_-]{20,200}$/.test(desafio.websiteKey))throw new Error('Desafio inválido.');
  const fetcher=opcoes.fetcher??fetch;
  const esperar=opcoes.esperar??(ms=>new Promise(resolve=>setTimeout(resolve,ms)));
  async function api(metodo:'getBalance'|'createTask'|'getTaskResult',body:object={}) {
    try {
      const r=await fetcher(`https://api.capmonster.cloud/${metodo}`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},body:JSON.stringify({clientKey:opcoes.env.CAPMONSTER_API_KEY,...body})});
      if(!r.ok)throw new Error();
      const data=await r.json();
      if(data.errorId!==0)throw new Error();
      return data;
    } catch { throw new Error('O CapMonster não concluiu a consulta. A tarefa não será recriada automaticamente.'); }
  }
  const {balance}=await api('getBalance');
  // This isolated pilot is restricted to the requested $0.10 bonus, not purchased balances.
  if(typeof balance!=='number'||!Number.isFinite(balance)||balance<=0||balance>0.100001)
    throw new Error('Saldo de teste não confirmado. Nenhuma tarefa criada.');
  if(!await opcoes.ativo())throw new Error('Simulação encerrada.');
  const created=await api('createTask',{task:{type:'RecaptchaV2EnterpriseTask',websiteURL:url,websiteKey:desafio.websiteKey,userAgent:desafio.userAgent,...(desafio.s?{enterprisePayload:{s:desafio.s}}:{})}});
  if(!Number.isSafeInteger(created.taskId)||created.taskId<=0)throw new Error('Identificador de tarefa inválido; não repetir automaticamente.');
  for(let i=0;i<24;i++){
    await esperar(5000);
    if(!await opcoes.ativo())throw new Error('Simulação encerrada; a tarefa não será repetida.');
    const result=await api('getTaskResult',{taskId:created.taskId});
    if(result.status==='processing')continue;
    const token=result.solution?.gRecaptchaResponse;
    if(result.status!=='ready'||typeof token!=='string'||token.length<20||token.length>20000)throw new Error('Resposta de teste inválida.');
    return token;
  }
  throw new Error('Tempo do teste esgotado. Nenhuma nova tarefa será criada.');
}

export async function aplicarRespostaCaptcha(page:Page,token:string) {
  conferirPaginaCaptcha(page.url());
  await page.evaluate((resposta:string)=>{
    const campos=document.querySelectorAll<HTMLTextAreaElement>('textarea[name="g-recaptcha-response"]');
    if(!campos.length)throw new Error('Campo de resposta indisponível');
    for(const campo of campos){campo.value=resposta;campo.dispatchEvent(new Event('input',{bubbles:true}));campo.dispatchEvent(new Event('change',{bubbles:true}));}
    // Only an explicitly published callback; no traversal of framework/private state.
    const nome=document.querySelector<HTMLElement>('[data-callback]')?.dataset.callback;
    if(nome&&/^[a-zA-Z_$][\w$]*$/.test(nome)){
      const callback=(window as unknown as Record<string,unknown>)[nome];
      if(typeof callback==='function')callback(resposta);
    }
  },token);
  // Never press Entrar or submit any form; acceptance is verified by the user.
}
