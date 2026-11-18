import test from 'node:test';
import assert from 'node:assert/strict';
import { saldoCreditosPagos, abaterCreditosPagos, conferirSaldoQuitado } from './creditosPagos.policy';
import { calcularFaturaUnificada } from '../billing/billing.engine';
const injecao = { id:'i', referencia:'JAN/2026', modalidade_faturamento:'INJECAO', status:'PAGO', base_calculo_kwh:800, energia_compensada:300, saldo_atual:500 };
test('500 kWh pagos: consumo parcial, esgotamento e cobrança somente do excedente', () => {
  const saldo = saldoCreditosPagos([injecao], 'FEV/2026');
  assert.equal(saldo,500);
  const primeiro = abaterCreditosPagos(saldo,200);
  assert.deepEqual(primeiro,{saldo_anterior_kwh:500,utilizado_kwh:200,saldo_restante_kwh:300,energia_cobravel_kwh:0});
  const historico = [injecao,{...injecao,id:'c',referencia:'FEV/2026',modalidade_faturamento:'COMPENSACAO',status:'ABERTA',energia_compensada:200,saldo_atual:300,dados_extraidos:{creditos_pre_pagos:primeiro}}];
  assert.equal(saldoCreditosPagos(historico,'MAR/2026'),300);
  const ultimo = abaterCreditosPagos(300,400);
  const calculo = calcularFaturaUnificada({modalidade:'COMPENSACAO',energiaInjetada:0,energiaCompensada:400,creditosPagosUtilizadosKwh:ultimo.utilizado_kwh,tarifaCheia:1,descontoPercentual:40,valorCemig:50});
  assert.equal(calculo.baseCalculoKwh,100); assert.equal(calculo.valorUsina,60); assert.equal(calculo.valorTotalUnificado,110);
});
test('não converte crédito da distribuidora ou injeção não quitada em crédito pago', () => {
  assert.equal(saldoCreditosPagos([{...injecao,status:'ABERTA'}]),0);
  assert.equal(saldoCreditosPagos([{...injecao,modalidade_faturamento:'COMPENSACAO'}]),0);
  assert.equal(saldoCreditosPagos([{...injecao,status:'CANCELADA'}]),0);
  assert.throws(()=>conferirSaldoQuitado([{...injecao,status:'ABERTA'}]),/ainda não quitados/);
  assert.equal(conferirSaldoQuitado([injecao]),500);
});
test('consumo posterior na própria injeção reduz estoque e saldo Cemig limita os créditos', () => {
  assert.equal(saldoCreditosPagos([injecao,{...injecao,id:'i2',referencia:'FEV/2026',status:'ABERTA',energia_compensada:150,saldo_atual:350}]),350);
  assert.equal(saldoCreditosPagos([{...injecao,saldo_atual:100}]),100);
});
test('reserva do rascunho impede uso duplicado e cancelamento exige conciliação', () => {
  const r={...injecao,id:'r',referencia:'FEV/2026',modalidade_faturamento:'COMPENSACAO',status:'RASCUNHO',energia_compensada:200,saldo_atual:300,dados_extraidos:{creditos_pre_pagos:{utilizado_kwh:200}}};
  assert.equal(saldoCreditosPagos([injecao,r]),300);
  assert.throws(()=>saldoCreditosPagos([injecao,{...r,status:'CANCELADA'}]),/cancelada sem substituição/);
  assert.equal(saldoCreditosPagos([injecao,{...r,id:'cancelada',status:'CANCELADA'}, {...r,status:'ABERTA'}]),300);
});
test('rejeita histórico incompleto, duplicado, fora de ordem e valores inválidos', () => {
  assert.throws(()=>saldoCreditosPagos([{...injecao,saldo_atual:null}]));
  assert.throws(()=>saldoCreditosPagos([injecao,{...injecao,id:'duplicado'}]));
  assert.throws(()=>saldoCreditosPagos([injecao],'DEZ/2025'));
  assert.throws(()=>saldoCreditosPagos([injecao],'MAR/2026'),/intermediárias/);
  assert.throws(()=>conferirSaldoQuitado([{...injecao,status:'RASCUNHO'}]),/rascunhos/);
  assert.throws(()=>abaterCreditosPagos(-1,100));
  assert.throws(()=>abaterCreditosPagos(500,NaN));
});
test('meses são ordenados cronologicamente e abatimento não muda com tarifa/desconto', () => {
  const anterior={...injecao,referencia:'DEZ/2025',saldo_atual:500};
  const saldo=saldoCreditosPagos([injecao,anterior]);
  assert.equal(saldo,500);
  assert.equal(abaterCreditosPagos(saldo,100).utilizado_kwh,100);
});
