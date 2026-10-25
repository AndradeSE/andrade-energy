import assert from 'node:assert/strict';
import test from 'node:test';
import type {Page} from 'playwright-core';
import {FalhaEtapaCemig,AcaoManualCemig,validarAnexoCemig} from './cemigCloud.portal';
import {CEMIG_PORTAL} from './cemigCloud.policy';

const uc='999999999999';
const csv=`${uc};00000000000;100;X`;

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
    getByRole:(_role:string,options?:{name?:string})=>{
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
  goto:async()=>{navegacoes++;},getByRole:()=>({filter:()=>({first:()=>({isVisible:async()=>false})}),click:async()=>{throw new Error('parada do teste');}})} as unknown as Page;
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
  getByRole:(_role:string,options?:{name?:string})=>{
   if(options?.name==='Realizar cadastro')return {click:async()=>{cliques++;}};
   return {filter:()=>opcoes};
  },locator:()=>{uploads++;throw new Error('Não deve anexar sem UC selecionada');}
 } as unknown as Page;
 await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'),(e:unknown)=>e instanceof FalhaEtapaCemig&&e.etapa==='USINA');
 assert.equal(cliques,0);assert.equal(uploads,0);
});

