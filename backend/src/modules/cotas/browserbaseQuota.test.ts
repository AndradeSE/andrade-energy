import test from 'node:test';
import assert from 'node:assert/strict';
import {consultarCotaAtual} from './browserbaseQuota';
test('consulta usa projeto atual, não o saldo 59 de outro coletor',async()=>{
 const [item]=await consultarCotaAtual(async()=>0);
 assert.equal(item.leitura?.usado,0);assert.equal(item.leitura?.restante,60);
});
test('falha não inventa zero nem usa cache de outra conta',async()=>{
 const [item]=await consultarCotaAtual(async()=>{throw new Error('secret');});
 assert.equal(item.leitura,null);assert.equal(item.consulta.status,'CONSULTA_INDISPONIVEL');
 assert.equal(JSON.stringify(item).includes('secret'),false);
});
