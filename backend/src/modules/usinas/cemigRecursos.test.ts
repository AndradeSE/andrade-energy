import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import type {Page} from 'playwright-core';
import {recursoPublicoCemig,resultadoRecursoCemig,falhaRedeRecursoCemig,acompanharRecursosCemig,recursosCemigRecusados} from './cemigRecursos';
import {FalhaAberturaPortalCemig} from './cemigPortal.open';

test('recusa de arquivos impede login incompleto com mensagem explícita',()=>{
 assert.equal(recursosCemigRecusados('JS_APLICACAO: HTTP_403 / ERR_ABORTED'),true);
 assert.equal(recursosCemigRecusados('CSS_PRINCIPAL: HTTP_401'),true);
 assert.equal(recursosCemigRecusados('CSS_PRINCIPAL: HTTP_200/OK; JS_APLICACAO: SEM_RESPOSTA / ERR_ABORTED'),false);
 const error=new FalhaAberturaPortalCemig('RECURSOS_RECUSADOS');
 assert.match(error.message,/Cemig recusou/);assert.match(error.message,/401\/403/);
});

test('diagnóstico aceita somente nomes fixos de arquivos públicos da origem oficial',()=>{
 assert.equal(recursoPublicoCemig('https://atende.cemig.com.br/Content/css?v=privado'),'CSS_PRINCIPAL');
 for(const url of ['https://atende.cemig.com.br/Login?token=privado','https://atende.cemig.com.br/api/conta',
  'https://evil.test/Content/css','http://atende.cemig.com.br/Content/css','invalido'])assert.equal(recursoPublicoCemig(url),null);
});
test('distingue CSS válido, HTML indevido, recusa HTTP e erro de rede sem texto externo',()=>{
 assert.equal(resultadoRecursoCemig('CSS_PRINCIPAL',200,'text/css; charset=utf-8'),'OK');
 assert.equal(resultadoRecursoCemig('CSS_PRINCIPAL',200,'text/html'),'HTML_EM_VEZ_DO_RECURSO');
 assert.equal(resultadoRecursoCemig('CSS_PRINCIPAL',403,'text/html'),'HTTP_403');
 assert.equal(resultadoRecursoCemig('JS_APLICACAO',200,'application/javascript'),'OK');
 assert.equal(resultadoRecursoCemig('CSS_PRINCIPAL',302,'text/html'),null);
 assert.equal(falhaRedeRecursoCemig('net::ERR_CONNECTION_RESET https://private.test/?secret=xyz'),'ERR_CONNECTION_RESET');
 assert.equal(falhaRedeRecursoCemig('secret=xyz'),'FALHA_REDE');
});
test('registra apenas status de recursos e remove ouvintes, sem URL ou dados da página',async()=>{
 const page=new EventEmitter();const coletor=acompanharRecursosCemig(page as unknown as Page);
 page.emit('response',{url:()=> 'https://atende.cemig.com.br/Content/css?v=segredo',status:()=>403,headerValue:async()=> 'text/html'});
 page.emit('response',{url:()=> 'https://atende.cemig.com.br/Login?token=segredo',status:()=>200,headerValue:async()=> 'text/html'});
 page.emit('requestfailed',{url:()=> 'https://atende.cemig.com.br/bundles/bootstrap',failure:()=>({errorText:'net::ERR_CERT_DATE_INVALID segredo'})});
 const resumo=await coletor.resumo();
 assert.match(resumo,/CSS_PRINCIPAL: HTTP_403/);assert.match(resumo,/JS_BOOTSTRAP: SEM_RESPOSTA \/ ERR_CERT_DATE_INVALID/);
 assert.doesNotMatch(resumo,/segredo|https|Login|token/);
 coletor.parar();assert.equal(page.listenerCount('response'),0);assert.equal(page.listenerCount('requestfailed'),0);
});
test('resposta antiga não sobrescreve o resultado da recarga mais recente',async()=>{
 const page=new EventEmitter();const coletor=acompanharRecursosCemig(page as unknown as Page);
 let liberar!:(value:string)=>void;
 page.emit('response',{url:()=> 'https://atende.cemig.com.br/Content/css',status:()=>403,headerValue:()=>new Promise<string>(resolve=>{liberar=resolve;})});
 page.emit('response',{url:()=> 'https://atende.cemig.com.br/Content/css',status:()=>200,headerValue:async()=> 'text/css'});
 liberar('text/html');
 assert.match(await coletor.resumo(),/CSS_PRINCIPAL: HTTP_200\/OK/);coletor.parar();
});
test('interrupção preserva a resposta HTTP em vez de esconder uma recusa',async()=>{
 const page=new EventEmitter();const coletor=acompanharRecursosCemig(page as unknown as Page);
 page.emit('response',{url:()=> 'https://atende.cemig.com.br/Content/css',status:()=>403,headerValue:async()=> 'text/html'});
 page.emit('requestfailed',{url:()=> 'https://atende.cemig.com.br/Content/css',failure:()=>({errorText:'net::ERR_ABORTED'})});
 assert.match(await coletor.resumo(),/CSS_PRINCIPAL: HTTP_403 \/ ERR_ABORTED/);coletor.parar();
});
