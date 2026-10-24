import assert from 'node:assert/strict';
import test from 'node:test';
import type {Page} from 'playwright-core';
import {FalhaEtapaCemig, validarAnexoCemig} from './cemigCloud.portal';
import {CEMIG_PORTAL} from './cemigCloud.policy';

const uc='999999999999';
const csv=`${uc};00000000000;100;X`;

test('a URL fora do portal falha no login sem navegar ou enviar arquivo', async()=>{
  const page={url:()=> 'https://example.com/'} as unknown as Page;
  await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'),
    (e:unknown)=> e instanceof FalhaEtapaCemig && e.etapa==='LOGIN');
});

test('falha na abertura do serviço oculta dados da exceção original', async()=>{
  const page={url:()=>CEMIG_PORTAL, goto:async()=>{throw new Error('SECRET-TOKEN CPF-DOM');}} as unknown as Page;
  await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'), (e:unknown)=>{
    assert.ok(e instanceof FalhaEtapaCemig);
    assert.equal(e.etapa,'SERVICO');
    assert.doesNotMatch(e.message,/SECRET|TOKEN|CPF/);
    assert.match(e.message,/Nenhum protocolo/);
    return true;
  });
});

test('distingue seleção da usina após abrir o serviço', async()=>{
  const page={
    url:()=>CEMIG_PORTAL,
    goto:async()=>{},
    getByRole:(_role:string,options?:{name?:string})=>{
      if(options?.name==='Realizar cadastro') return {click:async()=>{}};
      return {filter:()=>({first:()=>({waitFor:async()=>{throw new Error('PRIVATE DOM');}})})};
    },
  } as unknown as Page;
  await assert.rejects(validarAnexoCemig(page,uc,csv,'teste.csv'),
    (e:unknown)=> e instanceof FalhaEtapaCemig && e.etapa==='USINA' && !e.message.includes('PRIVATE'));
});
