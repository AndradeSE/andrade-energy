import test from 'node:test';
import assert from 'node:assert/strict';
import type {Page} from 'playwright-core';
import {prepararLoginLocal} from './cemigLocal.login';
test('sem chave ou opção de solver não envia desafio nem login; senha fica somente no formulário Cemig',async()=>{
 for(const [key,consent] of [['',true],['test-key',false]] as const){
  const calls:string[]=[];
  const page={locator:(selector:string)=>{assert.equal(selector,'#modalLoginComSenha:visible #senhaModal:visible');return {fill:async(value:string)=>{assert.equal(value,'test-password');calls.push('senha');}};}} as unknown as Page;
  const deps={prepararUsuarioCemig:async()=>{calls.push('usuario');},conferirUsuarioModalCemig:async()=>{calls.push('validar');},
   lerDesafioCemig:async()=>assert.fail('não enviar desafio'),obterRespostaCapmonsterLocal:async()=>assert.fail('não resolver'),aplicarRespostaCaptcha:async()=>assert.fail('não aplicar'),enviarLoginCemig:async()=>assert.fail('não enviar login')};
  assert.equal(await prepararLoginLocal(page,{login:'test-user',senha:'test-password',capmonster:key},async()=>true,consent,deps),'CAPTCHA_MANUAL');
  assert.deepEqual(calls,['usuario','validar','senha']);
 }
});
test('uma resolução é aplicada imediatamente antes de um login; falha não repete tarefa',async()=>{
 for(const falha of [false,true]){
  const calls:string[]=[];const page={locator:()=>({fill:async()=>{calls.push('senha');}})} as unknown as Page;
  const deps={prepararUsuarioCemig:async()=>{},conferirUsuarioModalCemig:async()=>{},
   lerDesafioCemig:async()=>({websiteURL:'https://atende.cemig.com.br/Login',websiteKey:'public-site-key',userAgent:'test'}),
   obterRespostaCapmonsterLocal:async(d:any,key:string)=>{assert.equal(key,'test-key');assert.equal(d.senha,undefined);calls.push('resolver');if(falha)throw new Error('failure');return 'test-response';},
   aplicarRespostaCaptcha:async(_p:Page,token:string)=>{assert.equal(token,'test-response');calls.push('aplicar');},enviarLoginCemig:async()=>{calls.push('login');}};
  const run=prepararLoginLocal(page,{login:'test-user',senha:'test-password',capmonster:'test-key'},async()=>true,true,deps);
  if(falha){await assert.rejects(run);assert.deepEqual(calls,['senha','resolver']);}
  else{assert.equal(await run,'LOGIN_ENVIADO');assert.deepEqual(calls,['senha','resolver','aplicar','login']);}
 }
});
