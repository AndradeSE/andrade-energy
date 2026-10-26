import test from 'node:test';
import assert from 'node:assert/strict';
import type {BrowserContext} from 'playwright-core';
import {filtrarEstadoCemig,cifrarSessaoCemig,abrirSessaoCemig,restaurarEstadoCemig} from './cemigSessionState';

const cookie=(name:string,domain='atende.cemig.com.br')=>({name,domain,value:'dummy-auth',path:'/',expires:-1,httpOnly:true,secure:true,sameSite:'Lax' as const});
const state={cookies:[cookie('login'),cookie('cf_clearance'),cookie('__cf_bm'),cookie('login','evil.test'),cookie('login','atende.cemig.com.br.evil.test')],origins:[
 {origin:'https://atende.cemig.com.br',localStorage:[{name:'auth',value:'dummy'}]},
 {origin:'https://example.com',localStorage:[{name:'private',value:'discard'}]},
]};

test('preserva somente autenticação comum da Cemig, sem cookies de desafio ou outros sites',()=>{
 const safe=filtrarEstadoCemig(state);
 assert.deepEqual(safe.cookies.map(c=>c.name),['login']);
 assert.equal(safe.origins.length,1);
 assert.equal(filtrarEstadoCemig({cookies:[{...cookie('login'),secure:false}],origins:[]}).cookies.length,0);
});

test('estado cifrado é vinculado a empresa, usuário e versão do acesso',()=>{
 const anterior=process.env.FINANCIAL_DATA_ENCRYPTION_KEY;
 process.env.FINANCIAL_DATA_ENCRYPTION_KEY='test-session-only';
 try {
  const cipher=cifrarSessaoCemig(state,'empresa-a','usuario-a','v1');
  assert.ok(!cipher.includes('dummy-auth'));
  assert.equal(abrirSessaoCemig(cipher,'empresa-a','usuario-a','v1').cookies.length,1);
  for(const args of [['empresa-b','usuario-a','v1'],['empresa-a','usuario-b','v1'],['empresa-a','usuario-a','v2']])
   assert.throws(()=>abrirSessaoCemig(cipher,...args as [string,string,string]));
  assert.throws(()=>abrirSessaoCemig('{}','empresa-a','usuario-a','v1'));
 }finally{if(anterior===undefined)delete process.env.FINANCIAL_DATA_ENCRYPTION_KEY;else process.env.FINANCIAL_DATA_ENCRYPTION_KEY=anterior;}
});

test('restauração usa apenas estado filtrado e não abre outro navegador',async()=>{
 let cookies=0,scripts=0;
 const context={addCookies:async(items:unknown[])=>{cookies=items.length;},addInitScript:async(_fn:unknown,data:{origins:unknown[]})=>{scripts++;assert.equal(data.origins.length,1);}} as unknown as BrowserContext;
 await restaurarEstadoCemig(context,state);
 assert.equal(cookies,1);assert.equal(scripts,1);
});
