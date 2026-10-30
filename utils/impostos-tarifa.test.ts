import test from 'node:test';
import assert from 'node:assert/strict';
import {aplicarImpostosNaTarifa} from './impostos-tarifa';
test('aceita tarifa e taxas com máscara brasileira e não capitaliza impostos',()=>{
 const r=aplicarImpostosNaTarifa('0,90329000','18','1','4');
 assert.ok(Math.abs(r-1.159550706)<.00000001);assert.equal(aplicarImpostosNaTarifa('0,90329000','18','1','4'),r);
});
test('não confunde campo vazio com isenção',()=>{
 assert.throws(()=>aplicarImpostosNaTarifa('1','18','','4'),/PIS/);
 assert.equal(aplicarImpostosNaTarifa('1','0','0','0'),1);
});
test('rejeita tarifa e alíquotas inválidas',()=>{
 assert.throws(()=>aplicarImpostosNaTarifa('0','18','1','4'));
 assert.throws(()=>aplicarImpostosNaTarifa('1','100','1','4'));
});
