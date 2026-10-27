import test from 'node:test';
import assert from 'node:assert/strict';
import {capmonsterQuota} from './capmonsterQuota';
test('saldo zero é leitura válida; usa somente getBalance e nunca expõe chave',async()=>{
 const value=await capmonsterQuota({CAPMONSTER_API_KEY:'private'} as NodeJS.ProcessEnv,(async(url,init)=>{assert.equal(url,'https://api.capmonster.cloud/getBalance');assert.equal(JSON.parse(String(init?.body)).clientKey,'private');return Response.json({errorId:0,balance:0});}) as typeof fetch);
 assert.equal(value.saldoDisponivel,0);assert.equal(value.consulta.status,'OK');assert.ok(!JSON.stringify(value).includes('private'));
});
test('sem chave não chama provedor e erro nunca vira saldo zero',async()=>{
 assert.equal((await capmonsterQuota({},(()=>{throw new Error('unexpected');}) as typeof fetch)).consulta.status,'SEM_CHAVE');
 const value=await capmonsterQuota({CAPMONSTER_API_KEY:'private'},(async()=>Response.json({errorId:1,errorDescription:'private'})) as typeof fetch);
 assert.equal(value.saldoDisponivel,null);assert.ok(!JSON.stringify(value).includes('private'));
});
