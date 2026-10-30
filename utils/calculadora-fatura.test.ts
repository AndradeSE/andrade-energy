import test from 'node:test';
import assert from 'node:assert/strict';
import {simularFaturas, ConfiguracaoSimulacao} from './calculadora-fatura';
const base: ConfiguracaoSimulacao = {consumo:500, compensacao:500, injecao:550, tarifa:1, desconto:20, modalidade:'COMPENSACAO', tipoGd:'GD1', disponibilidade:30, fioB:50, iluminacao:25, repassarDisponibilidade:true, repassarFioB:true};
test('compara as duas faturas e mantém iluminação sem desconto',()=>{
  const r=simularFaturas(base);
  assert.equal(r.cemigSemAndrade,525); assert.equal(r.cemigComAndrade,55);
  assert.equal(r.andrade,400); assert.equal(r.totalComAndrade,455); assert.equal(r.economia,70);
});
test('absorção abate somente Andrade; GD II inclui Fio B e GD I ignora',()=>{
  const r=simularFaturas({...base,tipoGd:'GD2',repassarDisponibilidade:false,repassarFioB:false});
  assert.equal(r.andrade,320); assert.equal(r.cemigComAndrade,105); assert.equal(r.economia,100);
});
test('injeção cobra créditos alocados, compensação cobra apenas os utilizados',()=>{
  assert.equal(simularFaturas({...base,modalidade:'INJECAO'}).andrade,440);
  const r=simularFaturas({...base,compensacao:200});
  assert.equal(r.cemigComAndrade,355); assert.equal(r.andrade,160);
});
test('não cria fatura negativa e preserva eventual economia negativa',()=>{
  assert.equal(simularFaturas({...base,repassarDisponibilidade:false,disponibilidade:1000}).andrade,0);
  assert.ok(simularFaturas({...base,modalidade:'INJECAO',injecao:1000}).economia<0);
});
test('valida consumo, compensação, tarifa, percentuais e valores não finitos',()=>{
  for(const patch of [{consumo:0},{compensacao:501},{desconto:101},{iluminacao:NaN},{fioB:-1}])assert.throws(()=>simularFaturas({...base,...patch}));
});
