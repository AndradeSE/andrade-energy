import test from 'node:test';
import assert from 'node:assert/strict';
import {consultarCotaAtual} from './browserbaseQuota';
import {FalhaConsultaBrowserbase} from '../usinas/cemigCloud.browserbase';
test('consulta usa projeto atual, não o saldo 59 de outro coletor',async()=>{
 const [item]=await consultarCotaAtual(async()=>0);
 assert.equal(item.leitura?.usado,0);assert.equal(item.leitura?.restante,60);
});
test('informa recusa de chave e projeto com mensagens estáticas sem expor resposta privada',async()=>{
 for(const [status,texto] of [[401,'recusou a chave'],[403,'não tem acesso'],[404,'não foi encontrado'],[429,'limitou temporariamente']] as const){
  const [item]=await consultarCotaAtual(async()=>{throw new FalhaConsultaBrowserbase(status);});
  assert.equal(item.leitura,null);assert.ok(item.observacao.includes(texto));
 }
});
test('falha não inventa zero nem usa cache de outra conta',async()=>{
 const [item]=await consultarCotaAtual(async()=>{throw new Error('secret');});
 assert.equal(item.leitura,null);assert.equal(item.consulta.status,'CONSULTA_INDISPONIVEL');
 assert.equal(JSON.stringify(item).includes('secret'),false);
});
