import test from 'node:test';
import assert from 'node:assert/strict';
import {capmonsterDisponivel,conferirPaginaCaptcha,obterRespostaCapmonster,lerDesafioCemig,localizarDesafioCemig,DesafioCemigIndisponivel,identificarTipoRecaptcha} from './cemigCloud.capmonster';
import type {Page} from 'playwright-core';
import {CEMIG_PREVIEW_DB} from './cemigCloud.policy';
const env={SUPABASE_URL:CEMIG_PREVIEW_DB,CEMIG_CLOUD_ENABLED:'true',CEMIG_CLOUD_EXECUTOR:'RENDER',CAPMONSTER_PREVIEW_ENABLED:'true',CAPMONSTER_API_KEY:'fake-test-key'};
const desafio={websiteURL:'https://atende.cemig.com.br/Login?private=query#fragment',websiteKey:'test-public-sitekey-123456',userAgent:'test-agent'};
const esperar=async()=>{};
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
