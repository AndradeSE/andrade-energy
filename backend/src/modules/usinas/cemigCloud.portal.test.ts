import assert from 'node:assert/strict';
import test from 'node:test';
import type {Page} from 'playwright-core';
import {FalhaEtapaCemig,AcaoManualCemig,validarAnexoCemig,paginaPortalCemig,fecharAvisoCookiesCemig,textoModalidadeSelecionada,confirmarModalidadeCemig} from './cemigCloud.portal';
import {CEMIG_PORTAL} from './cemigCloud.policy';

const uc='999999999999';
const csv=`${uc};00000000000;100;X`;
const semCookies={first:()=>({isVisible:async()=>false})};

test('a URL fora do portal falha no login sem navegar ou enviar arquivo', async()=>{
  const page={url:()=> 'https://example.com/'} as unknown as Page;
  await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'),
    (e:unknown)=> e instanceof FalhaEtapaCemig && e.etapa==='LOGIN');
});

test('falha na abertura do serviço oculta dados da exceção original', async()=>{
  const page={url:()=>new URL(CEMIG_PORTAL).origin+'/portal/home',getByText:()=>({first:()=>({isVisible:async()=>false})}),goto:async()=>{throw new Error('SECRET-TOKEN CPF-DOM');}} as unknown as Page;
  await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'), (e:unknown)=>{
    assert.ok(e instanceof AcaoManualCemig);
    assert.equal(e.tipo,'SERVICO');
    assert.doesNotMatch(e.message,/SECRET|TOKEN|CPF/);
    assert.match(e.message,/nenhum protocolo/i);
    return true;
  });
});

test('distingue seleção da usina após abrir o serviço', async()=>{
  const page={
    url:()=>CEMIG_PORTAL,
    getByText:()=>({first:()=>({isVisible:async()=>false})}),
    goto:async()=>{},
    getByRole:(_role:string,options?:{name?:string|RegExp})=>{
      if(options?.name instanceof RegExp)return semCookies;
      if(options?.name==='Realizar cadastro') return {click:async()=>{}};
      return {filter:()=>({first:()=>({isVisible:async()=>false,waitFor:async()=>{throw new Error('PRIVATE DOM');}})})};
    },
  } as unknown as Page;
  await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'),
    (e:unknown)=> e instanceof FalhaEtapaCemig && e.etapa==='USINA' && !e.message.includes('PRIVATE'));
});

test('não recarrega serviço já aberto nem reinicia verificação de segurança',async()=>{
 let navegacoes=0;
 const page={url:()=>CEMIG_PORTAL,getByText:()=>({first:()=>({isVisible:async()=>false})}),
  goto:async()=>{navegacoes++;},getByRole:(_role:string,options?:{name?:string|RegExp})=>options?.name instanceof RegExp?semCookies:({filter:()=>({first:()=>({isVisible:async()=>false})}),click:async()=>{throw new Error('parada do teste');}})} as unknown as Page;
 await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'),(e:unknown)=>e instanceof AcaoManualCemig&&e.tipo==='SERVICO');
 assert.equal(navegacoes,0);
});

test('verificação humana e login retornam ação manual antes de anexar ou navegar',async()=>{
 for(const url of [CEMIG_PORTAL,'https://atende.cemig.com.br/Login']){
  const page={url:()=>url,getByText:()=>({first:()=>({isVisible:async()=>true})}),
    goto:async()=>assert.fail('não navegar enquanto aguarda usuário'),getByRole:()=>assert.fail('não anexar nem clicar')} as unknown as Page;
  await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'),(e:unknown)=>e instanceof AcaoManualCemig);
 }
});

test('retoma na seleção de UC sem repetir Realizar cadastro',async()=>{
 let cliques=0,uploads=0;
 const opcoes={first:()=>({isVisible:async()=>true,waitFor:async()=>{}}),count:async()=>0};
 const page={url:()=>CEMIG_PORTAL,getByText:()=>({first:()=>({isVisible:async()=>false})}),
  getByRole:(_role:string,options?:{name?:string|RegExp})=>{
   if(options?.name instanceof RegExp)return semCookies;
   if(options?.name==='Realizar cadastro')return {click:async()=>{cliques++;}};
   return {filter:()=>opcoes};
  },locator:()=>{uploads++;throw new Error('Não deve anexar sem UC selecionada');}
 } as unknown as Page;
 await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'),(e:unknown)=>e instanceof FalhaEtapaCemig&&e.etapa==='USINA');
 assert.equal(cliques,0);assert.equal(uploads,0);
});


 test('seleciona portal autenticado em outra aba sem usar dominios semelhantes',()=>{
 const tab=(url:string)=>({url:()=>url} as Page);
 const login=tab('https://atende.cemig.com.br/Login');
 const home=tab('https://www.atendimento.cemig.com.br/portal/home');
 const fake=tab('https://www.atendimento.cemig.com.br.evil.test/portal/home');
 assert.equal(paginaPortalCemig([login,home,fake],login),home);
 const servico=tab(CEMIG_PORTAL);
 assert.equal(paginaPortalCemig([login,servico,home],login),servico);
 assert.equal(paginaPortalCemig([login,fake],login),login);
 });

test('rejeita aviso de cookies visível somente no domínio oficial',async()=>{
 let cliques=0;
 const page={url:()=>CEMIG_PORTAL,getByRole:(_role:string,options:{name:RegExp})=>{
  assert.ok(options.name.test('Reject All'));
  return {first:()=>({isVisible:async()=>true,click:async()=>{cliques++;}})};
 }} as unknown as Page;
 await fecharAvisoCookiesCemig(page);
 assert.equal(cliques,1);
 await fecharAvisoCookiesCemig({url:()=> 'https://example.com',getByRole:()=>assert.fail('domínio não autorizado')} as unknown as Page);
 await fecharAvisoCookiesCemig({url:()=>CEMIG_PORTAL,getByRole:()=>semCookies} as unknown as Page);
});

test('modalidade lê input e somente a opção selecionada do select',()=>{
 assert.equal(textoModalidadeSelecionada({tagName:'INPUT',value:'Autoconsumo remoto',textContent:''} as unknown as Element),'Autoconsumo remoto');
 assert.equal(textoModalidadeSelecionada({tagName:'SELECT',selectedOptions:[{textContent:'Geração compartilhada'}],textContent:'Autoconsumo remoto Geração compartilhada'} as unknown as Element),'Geração compartilhada');
});

test('modalidade divergente ou ausente interrompe com diagnóstico sem dados privados',async()=>{
 for(const ausente of [false,true]){
  const page={getByRole:()=>({waitFor:async()=>{if(ausente)throw new Error('PRIVATE DOM');},evaluate:async()=> 'Geração compartilhada'})} as unknown as Page;
  await assert.rejects(confirmarModalidadeCemig(page),(e:unknown)=>e instanceof FalhaEtapaCemig&&e.etapa==='MODALIDADE'&&!e.message.includes('PRIVATE'));
 }
 const page={getByRole:()=>({waitFor:async()=>{},evaluate:async()=> '  AUTOCONSUMO   REMOTO  '})} as unknown as Page;
 await confirmarModalidadeCemig(page);
});

