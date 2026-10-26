import test from 'node:test';
import assert from 'node:assert/strict';
import type {Page} from 'playwright-core';
import {abrirPortalCemig} from './cemigPortal.open';
import {CEMIG_PORTAL} from './cemigCloud.policy';

function pagina(url:string,opcoes:{humano?:boolean;pronto?:boolean;redireciona?:string}={}){
 let atual=url,navegacoes=0;
 const page={url:()=>atual,goto:async(destino:string)=>{navegacoes++;atual=opcoes.redireciona??destino;},
  getByText:()=>({first:()=>({isVisible:async()=>!!opcoes.humano})}),
  getByRole:()=>({isVisible:async()=>!!opcoes.pronto,filter:()=>({first:()=>({isVisible:async()=>false})})}),
 } as unknown as Page;
 return {page,navegacoes:()=>navegacoes};
}
test('abre serviço com navegador existente sem recarregar serviço já aberto',async()=>{
 const a=pagina('about:blank',{pronto:true});assert.equal(await abrirPortalCemig(a.page),'PORTAL');assert.equal(a.navegacoes(),1);
 const b=pagina(CEMIG_PORTAL,{pronto:true});assert.equal(await abrirPortalCemig(b.page),'PORTAL');assert.equal(b.navegacoes(),0);
});
test('não confunde carregamento com autenticação e pausa verificações',async()=>{
 assert.equal(await abrirPortalCemig(pagina(CEMIG_PORTAL).page),'CARREGANDO');
 assert.equal(await abrirPortalCemig(pagina(CEMIG_PORTAL,{humano:true}).page),'VERIFICACAO');
 assert.equal(await abrirPortalCemig(pagina('about:blank',{redireciona:'https://atende.cemig.com.br/Login'}).page),'LOGIN');
});
test('rejeita redirecionamento externo antes de consultar formulário',async()=>{
 const a=pagina('about:blank',{redireciona:'https://atende.cemig.com.br.evil.test/Login'});
 await assert.rejects(abrirPortalCemig(a.page),/não autorizado/);
});
test('preserva página oficial após timeout sem repetir navegação',async()=>{
 const a=pagina(CEMIG_PORTAL,{humano:true});let navegacoes=0;
 a.page.url=()=>navegacoes?'https://atende.cemig.com.br/Login':'about:blank';
 a.page.goto=(async()=>{navegacoes++;const e=new Error('private URL');e.name='TimeoutError';throw e;}) as any;
 assert.equal(await abrirPortalCemig(a.page),'VERIFICACAO');assert.equal(navegacoes,1);
 const b=pagina('about:blank');
 b.page.goto=(async()=>{const e=new Error('private URL');e.name='TimeoutError';throw e;}) as any;
 await assert.rejects(abrirPortalCemig(b.page));
});
