import test from 'node:test';
import assert from 'node:assert/strict';
import type {Page} from 'playwright-core';
import {abrirPortalCemig,loginCemigRenderizado} from './cemigPortal.open';
import {CEMIG_PORTAL,CEMIG_LOGIN} from './cemigCloud.policy';

test('estilo opcional pendente não bloqueia login renderizado; modais expostos bloqueiam',()=>{
 const originais=['document','window','getComputedStyle'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
 let estilos:any[]=[{sheet:{},disabled:false,media:''},{sheet:null,disabled:false,media:''}];
 let display='none';
 const modal={classList:{contains:()=>false},getClientRects:()=>[{}]};
 try{
  Object.defineProperty(globalThis,'document',{configurable:true,value:{
   querySelectorAll:(selector:string)=>selector==='.modal'?[modal]:estilos,
   querySelector:()=>({getClientRects:()=>[{}]}),
  }});
  Object.defineProperty(globalThis,'window',{configurable:true,value:{matchMedia:()=>({matches:true})}});
  Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({display})});
  assert.equal(loginCemigRenderizado(),true);
  display='block';assert.equal(loginCemigRenderizado(),false);
  display='none';estilos=[{sheet:null,disabled:false,media:''}];assert.equal(loginCemigRenderizado(),false);
 }finally{for(const [key,descriptor] of originais){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});

function pagina(url:string,opcoes:{humano?:boolean;pronto?:boolean;redireciona?:string;loginRenderizado?:boolean}={}){
 let atual=url,navegacoes=0;
 const page={url:()=>atual,goto:async(destino:string)=>{navegacoes++;atual=opcoes.redireciona??destino;},
  evaluate:async()=>opcoes.loginRenderizado!==false,
  reload:async()=>{},
  waitForFunction:async()=>{const erro=new Error('teste sem espera real');erro.name='TimeoutError';throw erro;},
  getByText:()=>({first:()=>({isVisible:async()=>!!opcoes.humano})}),
  getByRole:()=>({isVisible:async()=>!!opcoes.pronto,filter:()=>({first:()=>({isVisible:async()=>false})})}),
 } as unknown as Page;
 return {page,navegacoes:()=>navegacoes};
}
test('sessão nova começa no login indicado pelo titular, não no serviço de compensação',async()=>{
 const a=pagina('about:blank');
 assert.equal(await abrirPortalCemig(a.page),'LOGIN');
 assert.equal(a.page.url(),CEMIG_LOGIN);assert.equal(a.navegacoes(),1);
});

test('não considera a URL de login pronta quando os estilos e modais não carregaram',async()=>{
 const a=pagina('about:blank',{loginRenderizado:false});
 await assert.rejects(abrirPortalCemig(a.page),/\[RENDERIZACAO\]/);
 assert.equal(a.navegacoes(),1);
});

test('classifica falha de rede sem expor mensagem, dados ou endereço privado',async()=>{
 const a=pagina('about:blank');
 a.page.goto=(async()=>{throw new Error('net::ERR_CONNECTION_RESET https://private.invalid/?token=segredo');}) as any;
 await assert.rejects(abrirPortalCemig(a.page),(error:Error)=>{
  assert.match(error.message,/\[REDE\]/);assert.doesNotMatch(error.message,/private|token|segredo/);return true;
 });
});

test('aguarda a renderização do login sem recarregar a sessão',async()=>{
 const opcoes={loginRenderizado:false};const a=pagina('about:blank',opcoes);
 a.page.waitForFunction=(async()=>{opcoes.loginRenderizado=true;}) as any;
 assert.equal(await abrirPortalCemig(a.page),'LOGIN');assert.equal(a.navegacoes(),1);
});

test('recupera estilos em uma única recarga antes de preencher qualquer acesso',async()=>{
 const opcoes={loginRenderizado:false};const a=pagina('about:blank',opcoes);let recargas=0;
 a.page.reload=(async()=>{recargas++;opcoes.loginRenderizado=true;}) as any;
 assert.equal(await abrirPortalCemig(a.page),'LOGIN');assert.equal(recargas,1);assert.equal(a.navegacoes(),1);
});

test('não repete recargas quando o documento permanece incompleto',async()=>{
 const a=pagina('about:blank',{loginRenderizado:false});let recargas=0;
 a.page.reload=(async()=>{recargas++;}) as any;
 await assert.rejects(abrirPortalCemig(a.page),/após uma recarga/);assert.equal(recargas,1);
});
test('sessão restaurada também inicia no endereço de login correto',async()=>{
 const a=pagina('about:blank');assert.equal(await abrirPortalCemig(a.page,true),'LOGIN');assert.equal(a.page.url(),CEMIG_LOGIN);
 const b=pagina(CEMIG_LOGIN);assert.equal(await abrirPortalCemig(b.page,true),'LOGIN');assert.equal(b.navegacoes(),0);
});
test('aguarda prontidão depois de redirecionamento oficial, sem segundo navegador',async()=>{
 const opcoes={pronto:false,redireciona:CEMIG_PORTAL};const a=pagina('about:blank',opcoes);let esperas=0;
 a.page.waitForFunction=(async(_fn:unknown,_arg:unknown,options:any)=>{assert.equal(options.timeout,15000);esperas++;opcoes.pronto=true;}) as any;
 assert.equal(await abrirPortalCemig(a.page,true),'PORTAL');assert.equal(esperas,1);assert.equal(a.navegacoes(),1);
});
test('verificação humana pausa imediatamente sem aguardar nem clicar',async()=>{
 const a=pagina(CEMIG_PORTAL,{humano:true});
 a.page.waitForFunction=(async()=>assert.fail('não esperar um desafio humano')) as any;
 assert.equal(await abrirPortalCemig(a.page,true),'VERIFICACAO');
});
test('não confunde carregamento com autenticação e pausa verificações',async()=>{
 assert.equal(await abrirPortalCemig(pagina(CEMIG_PORTAL,{redireciona:CEMIG_PORTAL}).page,true),'CARREGANDO');
 assert.equal(await abrirPortalCemig(pagina(CEMIG_PORTAL,{humano:true}).page,true),'VERIFICACAO');
 assert.equal(await abrirPortalCemig(pagina('about:blank',{redireciona:'https://atende.cemig.com.br/Login'}).page),'LOGIN');
});
test('rejeita redirecionamento externo antes de consultar formulário',async()=>{
 const a=pagina('about:blank',{redireciona:'https://atende.cemig.com.br.evil.test/Login'});
 await assert.rejects(abrirPortalCemig(a.page,true),/não autorizado/);
});
test('preserva página oficial após timeout sem repetir navegação',async()=>{
 const a=pagina(CEMIG_PORTAL,{humano:true});let navegacoes=0;
 a.page.url=()=>navegacoes?'https://atende.cemig.com.br/Login':'about:blank';
 a.page.goto=(async()=>{navegacoes++;const e=new Error('private URL');e.name='TimeoutError';throw e;}) as any;
 assert.equal(await abrirPortalCemig(a.page,true),'VERIFICACAO');assert.equal(navegacoes,1);
 const b=pagina('about:blank');
 b.page.goto=(async()=>{const e=new Error('private URL');e.name='TimeoutError';throw e;}) as any;
 await assert.rejects(abrirPortalCemig(b.page,true));
});


