import test from 'node:test';
import assert from 'node:assert/strict';
import {simularEconomia} from './simulacao-economia';
test('aplica desconto somente à energia elegível e mantém demais custos',()=>{
 const r=simularEconomia(1000,800,27);
 assert.equal(r.economiaMensal,216);assert.equal(r.totalEstimado,784);assert.equal(r.outrosCustos,200);assert.equal(r.energiaComDesconto,584);assert.equal(r.economiaAnual,2592);assert.equal(r.descontoEfetivo,21.6);
});
test('valida bases e arredonda moeda em centavos',()=>{
 assert.throws(()=>simularEconomia(100,101,27));assert.throws(()=>simularEconomia(100,80,101));assert.throws(()=>simularEconomia(NaN,80,27));
 const r=simularEconomia(100.01,80.01,27);assert.equal(r.economiaMensal,21.6);assert.equal(r.totalEstimado,78.41);
});
