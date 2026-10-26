import test from 'node:test';
import assert from 'node:assert/strict';
import {capmonsterDisponivel,conferirPaginaCaptcha,obterRespostaCapmonster,lerDesafioCemig,localizarDesafioCemig,DesafioCemigIndisponivel,identificarTipoRecaptcha} from './cemigCloud.capmonster';
import type {Page} from 'playwright-core';
import {CEMIG_PREVIEW_DB} from './cemigCloud.policy';
const env={SUPABASE_URL:CEMIG_PREVIEW_DB,CEMIG_CLOUD_ENABLED:'true',CEMIG_CLOUD_EXECUTOR:'RENDER',CAPMONSTER_PREVIEW_ENABLED:'true',CAPMONSTER_API_KEY:'fake-test-key'};
const desafio={websiteURL:'https://atende.cemig.com.br/Login?private=query#fragment',websiteKey:'test-public-sitekey-123456',userAgent:'test-agent'};
const esperar=async()=>{};
test('Cloudflare antes do login retorna diagnóstico sem ler campos ou enviar tarefa',async()=>{
 const page={url:()=> 'https://www.atendimento.cemig.com.br/portal/services/compensation-gd',
 getByText:()=>({first:()=>({isVisible:async()=>true})}),evaluate:()=>assert.fail('não ler dados do desafio nesta etapa')} as unknown as Page;
 await assert.rejects(localizarDesafioCemig([page]),(e:unknown)=>e instanceof DesafioCemigIndisponivel&&e.tipo==='CLOUDFLARE'&&e.message.includes('Nenhuma tarefa'));
});
test('localiza CAPTCHA em nova aba do login sem avaliar outras origens',async()=>{
 const inicio={url:()=> 'https://www.atendimento.cemig.com.br/portal/home'} as Page;
 const externo={url:()=> 'https://example.com/',evaluate:()=>assert.fail('Não avaliar domínio externo')} as unknown as Page;
 const login={url:()=> 'https://atende.cemig.com.br/Login',evaluate:async()=>({key:'test-public-sitekey-123456',src:'https://www.google.com/recaptcha/enterprise/anchor?k=test',userAgent:'test',s:undefined})} as unknown as Page;
 assert.equal((await localizarDesafioCemig([inicio,login,externo])).page,login);
 await assert.rejects(localizarDesafioCemig([inicio,externo]),DesafioCemigIndisponivel);
});
test('distingue v2 comum de Enterprise e rejeita domínios falsos e outros desafios',()=>{
 assert.equal(identificarTipoRecaptcha('https://www.google.com/recaptcha/api2/anchor?k=test'),'RecaptchaV2Task');
 assert.equal(identificarTipoRecaptcha('https://www.recaptcha.net/recaptcha/enterprise/anchor?k=test'),'RecaptchaV2EnterpriseTask');
 for(const src of ['https://www.google.com.evil.test/recaptcha/api2/anchor','http://www.google.com/recaptcha/api2/anchor','https://challenges.cloudflare.com/turnstile','https://www.google.com/recaptcha/api2/bframe'])assert.equal(identificarTipoRecaptcha(src),null);
});
test('v2 comum usa task e parâmetro técnico corretos sem payload Enterprise',async()=>{
 let task:any;let calls=0;
 const fetcher=(async(_url:any,options:any)=>{
  if(++calls===1)return Response.json({errorId:0,balance:0.1});
  if(calls===2){task=JSON.parse(options.body).task;return Response.json({errorId:0,taskId:123});}
  return Response.json({errorId:0,status:'ready',solution:{gRecaptchaResponse:'fake-response-token-for-unit-test'}});
 }) as typeof fetch;
 await obterRespostaCapmonster({...desafio,tipo:'RecaptchaV2Task',s:'test-technical-value'},{env,ativo:async()=>true,esperar,fetcher});
 assert.equal(task.type,'RecaptchaV2Task');assert.equal(task.recaptchaDataSValue,'test-technical-value');assert.equal(task.enterprisePayload,undefined);
});
test('desafio ausente permite corrigir a tela sem enviar tarefa nem expor DOM',async()=>{
 const page={url:()=> 'https://atende.cemig.com.br/Login',evaluate:async()=>({key:'',userAgent:'test',s:undefined})} as unknown as Page;
 await assert.rejects(lerDesafioCemig(page),e=>e instanceof DesafioCemigIndisponivel&&e.message.includes('Nenhuma tarefa'));
});
test('CapMonster só habilita Preview e chave presente; URL remove query e fragmento',()=>{
 assert.equal(capmonsterDisponivel(env),true);
 for(const patch of [{SUPABASE_URL:'https://production.supabase.co'},{CAPMONSTER_PREVIEW_ENABLED:'false'},{CAPMONSTER_API_KEY:''},{CEMIG_CLOUD_EXECUTOR:'NETLIFY'}])assert.equal(capmonsterDisponivel({...env,...patch}),false);
 assert.equal(conferirPaginaCaptcha(desafio.websiteURL),'https://atende.cemig.com.br/Login');
 for(const url of ['https://atende.cemig.com.br.evil.test/Login','http://atende.cemig.com.br/Login','https://user:secret@atende.cemig.com.br/Login','https://www.atendimento.cemig.com.br/portal/services/compensation-gd'])assert.throws(()=>conferirPaginaCaptcha(url));
});
test('saldo inválido ou comprado não cria tarefa',async()=>{
 for(const balance of [0,-1,0.2,'0.1',null]){
  let calls=0;
  const fetcher=(async()=>{calls++;return Response.json({errorId:0,balance});}) as typeof fetch;
  await assert.rejects(obterRespostaCapmonster(desafio,{env,ativo:async()=>true,esperar,fetcher}));
  assert.equal(calls,1);
 }
});
test('uma tarefa e polling limitado; não transmite campos extras e limpa URL',async()=>{
 const calls:{url:string;body:Record<string,any>}[]=[];
 const respostas=[{errorId:0,balance:0.1},{errorId:0,taskId:123},{errorId:0,status:'processing'},
  {errorId:0,status:'ready',solution:{gRecaptchaResponse:'fake-response-token-for-unit-test'}}];
 const fetcher=(async(url:any,options:any)=>{calls.push({url:String(url),body:JSON.parse(options.body)});return Response.json(respostas.shift());}) as typeof fetch;
 assert.equal(await obterRespostaCapmonster(desafio,{env,ativo:async()=>true,esperar,fetcher}),'fake-response-token-for-unit-test');
 assert.equal(calls.filter(c=>c.url.endsWith('/createTask')).length,1);
 assert.deepEqual(calls[1].body.task,{type:'RecaptchaV2EnterpriseTask',websiteURL:'https://atende.cemig.com.br/Login',websiteKey:desafio.websiteKey,userAgent:'test-agent'});
});
test('timeout ambíguo de createTask nunca recria a tarefa',async()=>{
 let calls=0;
 const fetcher=(async()=>{if(++calls===1)return Response.json({errorId:0,balance:0.1});throw new Error('secret-provider-error');}) as typeof fetch;
 await assert.rejects(obterRespostaCapmonster(desafio,{env,ativo:async()=>true,esperar,fetcher}),e=>e instanceof Error&&!e.message.includes('secret-provider'));
 assert.equal(calls,2);
});
test('cancelamento antes de criar tarefa não consome crédito',async()=>{
 let calls=0;
 const fetcher=(async()=>{calls++;return Response.json({errorId:0,balance:0.1});}) as typeof fetch;
 await assert.rejects(obterRespostaCapmonster(desafio,{env,ativo:async()=>false,esperar,fetcher}));
 assert.equal(calls,1);
});
test('processamento sem resultado termina sem repetir createTask',async()=>{
 let calls=0;
 const fetcher=(async()=>Response.json(++calls===1?{errorId:0,balance:0.1}:calls===2?{errorId:0,taskId:123}:{errorId:0,status:'processing'})) as typeof fetch;
 await assert.rejects(obterRespostaCapmonster(desafio,{env,ativo:async()=>true,esperar,fetcher}));
 assert.equal(calls,26);
});

test('falha temporária na leitura consulta a mesma tarefa com espera maior',async()=>{
 for(const falha of ['rede',429,503]){
  const chamadas:{metodo:string;taskId?:number}[]=[];const intervalos:number[]=[];let leituras=0;
  const fetcher=(async(url:any,options:any)=>{
   const metodo=String(url).split('/').pop()!;const body=JSON.parse(options.body);chamadas.push({metodo,taskId:body.taskId});
   if(metodo==='getBalance')return Response.json({errorId:0,balance:0.1});
   if(metodo==='createTask')return Response.json({errorId:0,taskId:789});
   if(++leituras===1){if(falha==='rede')throw new Error('segredo interno');return new Response('',{status:falha as number});}
   return Response.json({errorId:0,status:'ready',solution:{gRecaptchaResponse:'fake-response-token-for-unit-test'}});
  }) as typeof fetch;
  await obterRespostaCapmonster(desafio,{env,ativo:async()=>true,fetcher,esperar:async(ms)=>{intervalos.push(ms);}});
  assert.equal(chamadas.filter(c=>c.metodo==='createTask').length,1);
  assert.deepEqual(chamadas.filter(c=>c.metodo==='getTaskResult').map(c=>c.taskId),[789,789]);
  assert.deepEqual(intervalos,[5000,10000]);
 }
});

test('CAPTCHA_NOT_READY continua consultando sem criar outra tarefa',async()=>{
 let chamadas=0;
 const fetcher=(async()=>Response.json(++chamadas===1?{errorId:0,balance:0.1}:chamadas===2?{errorId:0,taskId:123}:chamadas===3?{errorId:1,errorCode:'CAPTCHA_NOT_READY'}:{errorId:0,status:'ready',solution:{gRecaptchaResponse:'fake-response-token-for-unit-test'}})) as typeof fetch;
 await obterRespostaCapmonster(desafio,{env,ativo:async()=>true,fetcher,esperar});assert.equal(chamadas,4);
});

test('três falhas consecutivas de leitura param sem repetir criação',async()=>{
 let criacoes=0,leituras=0;const intervalos:number[]=[];
 const fetcher=(async(url:any)=>{
  if(String(url).endsWith('/getBalance'))return Response.json({errorId:0,balance:0.1});
  if(String(url).endsWith('/createTask')){criacoes++;return Response.json({errorId:0,taskId:123});}
  leituras++;throw new Error('chave privada no erro');
 }) as typeof fetch;
 await assert.rejects(obterRespostaCapmonster(desafio,{env,ativo:async()=>true,fetcher,esperar:async(ms)=>{intervalos.push(ms);}}),e=>e instanceof Error&&!e.message.includes('privada'));
 assert.equal(criacoes,1);assert.equal(leituras,3);assert.deepEqual(intervalos,[5000,10000,20000]);
});

test('erro permanente informa motivo seguro e não repete a consulta',async()=>{
 for(const codigo of ['ERROR_CAPTCHA_UNSOLVABLE','ERROR_TOKEN_EXPIRED','codigo-com-segredo']){
  let chamadas=0;
  const fetcher=(async()=>Response.json(++chamadas===1?{errorId:0,balance:0.1}:chamadas===2?{errorId:0,taskId:123}:{errorId:1,errorCode:codigo,errorDescription:'descricao privada'})) as typeof fetch;
  await assert.rejects(obterRespostaCapmonster(desafio,{env,ativo:async()=>true,fetcher,esperar}),(e:unknown)=>{
   assert.ok(e instanceof Error);assert.doesNotMatch(e.message,/descricao privada|codigo-com-segredo/);
   if(codigo==='ERROR_CAPTCHA_UNSOLVABLE')assert.match(e.message,/não conseguiu resolver/);
   if(codigo==='ERROR_TOKEN_EXPIRED')assert.match(e.message,/desafio.*expirou/);
   return true;
  });assert.equal(chamadas,3);
 }
});

test('cancelamento durante falha transitória impede nova consulta',async()=>{
 let ativo=0,chamadas=0;
 const fetcher=(async()=>{chamadas++;if(chamadas===1)return Response.json({errorId:0,balance:0.1});if(chamadas===2)return Response.json({errorId:0,taskId:123});throw new Error();}) as typeof fetch;
 await assert.rejects(obterRespostaCapmonster(desafio,{env,ativo:async()=>++ativo<=2,fetcher,esperar}));
 assert.equal(chamadas,3);
});
