import type {Page} from 'playwright-core';
import {exigirCemigSimulacao} from './cemigCloud.policy';

export function capmonsterDisponivel(env:NodeJS.ProcessEnv) {
  try { exigirCemigSimulacao(env); } catch { return false; }
  return env.CEMIG_CLOUD_EXECUTOR==='RENDER' && env.CAPMONSTER_PREVIEW_ENABLED==='true' && Boolean(env.CAPMONSTER_API_KEY?.trim());
}
export function conferirPaginaCaptcha(valor:string) {
  const u=new URL(valor);
  if(!['https://atende.cemig.com.br','https://www.atendimento.cemig.com.br'].includes(u.origin)||u.username||u.password||
    !/^\/(?:login|portal\/login|auth\/login)\/?$/i.test(u.pathname))
    throw new Error('Página fora da Cemig autorizada.');
  return u.origin+u.pathname;
}
type TipoCaptcha='RecaptchaV2Task'|'RecaptchaV2EnterpriseTask';
type Desafio={websiteURL:string;websiteKey:string;userAgent:string;s?:string;tipo?:TipoCaptcha};
export function identificarTipoRecaptcha(src:string):TipoCaptcha|null {
  try {
    const u=new URL(src);
    if(u.protocol!=='https:'||!['www.google.com','www.recaptcha.net'].includes(u.hostname))return null;
    if(u.pathname==='/recaptcha/enterprise/anchor')return 'RecaptchaV2EnterpriseTask';
    if(u.pathname==='/recaptcha/api2/anchor')return 'RecaptchaV2Task';
    return null;
  }catch{return null;}
}
export class DesafioCemigIndisponivel extends Error {
  constructor(public readonly tipo:'LOGIN'|'CLOUDFLARE'='LOGIN'){super(tipo==='CLOUDFLARE'
    ?'A tela atual é a verificação Cloudflare antes do login, não o reCAPTCHA de Entrar com senha. Conclua essa verificação na mesma sessão; este teste não envia Cloudflare ao CapMonster. Nenhuma tarefa foi criada e nenhum crédito foi usado.'
    :'Abra o login em nuvem e escolha entrar com senha até o CAPTCHA aparecer. Nenhuma tarefa foi enviada ao CapMonster.');}
}
export async function lerDesafioCemig(page:Page):Promise<Desafio> {
  try {
  const origem=new URL(page.url());
  if(['https://atende.cemig.com.br','https://www.atendimento.cemig.com.br'].includes(origem.origin)&&!origem.username&&!origem.password){
    const verificacao=page.getByText?.(/Performing security verification|Verify you are human|Verifique se você é humano/i).first();
    if(verificacao&&await verificacao.isVisible())throw new DesafioCemigIndisponivel('CLOUDFLARE');
  }
  const websiteURL=conferirPaginaCaptcha(page.url());
  const dados=await page.evaluate(()=>{
    const frames=Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe[src]'));
    const urls=frames.map(f=>{try{return new URL(f.src);}catch{return null;}});
    const frame=urls.find(u=>u&&u.protocol==='https:'&&['www.google.com','www.recaptcha.net'].includes(u.hostname)&&['/recaptcha/enterprise/anchor','/recaptcha/api2/anchor'].includes(u.pathname));
    const widget=document.querySelector<HTMLElement>('[data-sitekey]');
    return {key:frame?.searchParams.get('k')??'',src:frame?.toString()??'',s:widget?.dataset.s,userAgent:navigator.userAgent};
  });
  if(!/^[a-zA-Z0-9_-]{20,200}$/.test(dados.key)||dados.userAgent.length>1000||(dados.s?.length??0)>4000)
    throw new Error('Desafio Enterprise não identificado. Nenhum crédito utilizado.');
  const tipo=identificarTipoRecaptcha(dados.src);
  if(!tipo)throw new Error('Tipo não reconhecido');
  return {websiteURL,websiteKey:dados.key,userAgent:dados.userAgent,tipo,...(dados.s?{s:dados.s}:{})};
  } catch(error) { if(error instanceof DesafioCemigIndisponivel)throw error;throw new DesafioCemigIndisponivel(); }
}

/** Manual login may open another tab. Inspect only allowed login pages, never fields. */
export async function localizarDesafioCemig(pages:Page[]) {
  let verificacao:DesafioCemigIndisponivel|undefined;
  for(const page of [...pages].reverse()){
    try {
      const desafio=await lerDesafioCemig(page);
      return {page,desafio};
    } catch(error) {
      if(!(error instanceof DesafioCemigIndisponivel))throw error;
      if(error.tipo==='CLOUDFLARE')verificacao=error;
    }
  }
  throw verificacao??new DesafioCemigIndisponivel();
}

export class FalhaCapmonster extends Error {
  constructor(etapa:'SALDO'|'CRIACAO'|'RESULTADO',codigo?:string,public readonly temporaria=false){
    const textos={SALDO:'Falha ao consultar o saldo. Nenhuma tarefa foi criada.',CRIACAO:'Falha ao criar a tarefa. O resultado da solicitação exige conferência; não repetir automaticamente.',RESULTADO:'Falha ao consultar o resultado da tarefa. Ela não será recriada automaticamente.'};
    // Only static, documented codes are exposed. Never forward provider bodies,
    // descriptions, request URLs, keys or challenge data to the app.
    const motivos:Record<string,string>={
      ERROR_CAPTCHA_UNSOLVABLE:'O provedor não conseguiu resolver o desafio.',
      ERROR_RECAPTCHA_TIMEOUT:'O tempo de resolução no provedor terminou.',
      ERROR_TOKEN_EXPIRED:'O desafio enviado ao provedor expirou.',
      ERROR_RECAPTCHA_INVALID_SITEKEY:'O provedor rejeitou a identificação pública do desafio.',
      ERROR_RECAPTCHA_INVALID_DOMAIN:'O provedor rejeitou o domínio do desafio.',
      ERROR_KEY_DOES_NOT_EXIST:'O provedor rejeitou a chave configurada.',
      ERROR_ZERO_BALANCE:'O provedor informou saldo insuficiente.',
      ERROR_NO_SUCH_CAPCHA_ID:'O resultado da tarefa não está disponível no provedor.',
      WRONG_CAPTCHA_ID:'O resultado da tarefa não está disponível no provedor.',
      ERROR_IP_NOT_ALLOWED:'O provedor não autorizou a origem da consulta.',
      ERROR_IP_BANNED:'O provedor bloqueou temporariamente a origem da consulta.',
      ERROR_IP_BLOCKED:'O provedor bloqueou a origem da consulta.',
      ERROR_TOO_MUCH_REQUESTS:'O provedor limitou a frequência das consultas.',
      ERROR_DOMAIN_NOT_ALLOWED:'O provedor não permite esse domínio.',
      ERROR_TASK_NOT_SUPPORTED:'O provedor não aceita esse tipo de tarefa.',
    };
    super([textos[etapa],codigo&&Object.hasOwn(motivos,codigo)?motivos[codigo]:''].filter(Boolean).join(' '));
  }
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
      const etapa=metodo==='getBalance'?'SALDO':metodo==='createTask'?'CRIACAO':'RESULTADO';
      if(!r.ok)throw new FalhaCapmonster(etapa,undefined,metodo==='getTaskResult'&&(r.status===429||r.status>=500&&r.status<=599));
      const data=await r.json();
      if(data.errorId!==0){
        if(metodo==='getTaskResult'&&data.errorCode==='CAPTCHA_NOT_READY')return {status:'processing'};
        throw new FalhaCapmonster(etapa,typeof data.errorCode==='string'?data.errorCode:undefined,metodo==='getTaskResult'&&data.errorCode==='ERROR_TOO_MUCH_REQUESTS');
      }
      return data;
    } catch(error) {
      if(error instanceof FalhaCapmonster)throw error;
      throw new FalhaCapmonster(metodo==='getBalance'?'SALDO':metodo==='createTask'?'CRIACAO':'RESULTADO',undefined,metodo==='getTaskResult');
    }
  }
  const {balance}=await api('getBalance');
  // This isolated pilot is restricted to the requested $0.10 bonus, not purchased balances.
  if(typeof balance!=='number'||!Number.isFinite(balance)||balance<=0||balance>0.100001)
    throw new Error('Saldo de teste não confirmado. Nenhuma tarefa criada.');
  if(!await opcoes.ativo())throw new Error('Simulação encerrada.');
  const tipo=desafio.tipo??'RecaptchaV2EnterpriseTask';
  if(!['RecaptchaV2Task','RecaptchaV2EnterpriseTask'].includes(tipo))throw new Error('Tipo não suportado.');
  const created=await api('createTask',{task:{type:tipo,websiteURL:url,websiteKey:desafio.websiteKey,userAgent:desafio.userAgent,...(desafio.s?(tipo==='RecaptchaV2EnterpriseTask'?{enterprisePayload:{s:desafio.s}}:{recaptchaDataSValue:desafio.s}):{})}});
  if(!Number.isSafeInteger(created.taskId)||created.taskId<=0)throw new Error('Identificador de tarefa inválido; não repetir automaticamente.');
  let falhasConsecutivas=0;
  for(let i=0;i<24;i++){
    await esperar(falhasConsecutivas?5000*2**falhasConsecutivas:5000);
    if(!await opcoes.ativo())throw new Error('Simulação encerrada; a tarefa não será repetida.');
    let result;
    try { result=await api('getTaskResult',{taskId:created.taskId});falhasConsecutivas=0; }
    catch(error){
      // Retrying a read of the same task cannot create another paid task.
      // Creation remains strictly once; permanent provider errors stop here.
      if(error instanceof FalhaCapmonster&&error.temporaria&&++falhasConsecutivas<3&&i<23)continue;
      throw error;
    }
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
