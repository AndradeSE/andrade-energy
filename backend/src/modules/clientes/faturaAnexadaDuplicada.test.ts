import assert from 'node:assert/strict';
import test from 'node:test';
import { chaveFaturaAnexada, faturasAnexadasUnicas } from './faturaAnexadaDuplicada';
test('PDF/foto da mesma conta não duplica; correção, outra competência ou UC permanecem',()=>{
 const dados={uc:'7.206.705.018-39',referencia:'OUT/2026',vencimento:'15/11/2026',valorTotal:200,consumo:214};
 const a={id:'a',dados_fatura:dados},b={id:'b',dados_fatura:{...dados,uc:'720670501839'}};
 assert.equal(chaveFaturaAnexada(a.dados_fatura),chaveFaturaAnexada(b.dados_fatura));
 const other=[{id:'c',dados_fatura:{...dados,referencia:'NOV/2026'}},{id:'d',dados_fatura:{...dados,valorTotal:201}},{id:'e',dados_fatura:{...dados,uc:'1121361801894'}}];
 assert.deepEqual(faturasAnexadasUnicas([a,b,...other]).map(x=>x.id),['a','c','d','e']);
 assert.equal(chaveFaturaAnexada({uc:dados.uc}),null);
 assert.equal(faturasAnexadasUnicas([{dados_fatura:{}},{dados_fatura:{}}]).length,2);
});
