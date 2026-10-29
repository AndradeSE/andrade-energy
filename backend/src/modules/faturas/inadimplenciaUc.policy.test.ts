import test from 'node:test';import assert from 'node:assert/strict';
import {faturasVencidasSemPagamento,suspenderUcPorInadimplencia,bloqueioUcAtivo} from './inadimplenciaUc.policy';
const uc={id:'uc1',numero:'12345678',cliente_id:'c1'};
const invoice=(referencia:string,extra:any={})=>({id:referencia,cliente_id:'c1',unidade_consumidora_id:'uc1',numero_instalacao:'12345678',referencia,status:'ABERTA',vencimento:'2026-10-01',cobrancas:[],...extra});
test('retoma somente depois de quitar todas as abertas, inclusive não vencidas',()=>{
 assert.equal(bloqueioUcAtivo(false,{abertas:2,vencidas:2}),true);
 assert.equal(bloqueioUcAtivo(true,{abertas:1,vencidas:1}),true);
 assert.equal(bloqueioUcAtivo(true,{abertas:1,vencidas:0}),true);
 assert.equal(bloqueioUcAtivo(true,{abertas:0,vencidas:0}),false);
});
test('duas competências vencidas suspendem; hoje, futuras e duplicadas não contam duas vezes',()=>{
 assert.equal(suspenderUcPorInadimplencia(faturasVencidasSemPagamento(uc,[invoice('SET/2026'),invoice('OUT/2026')],'2026-10-29')),true);
 assert.equal(faturasVencidasSemPagamento(uc,[invoice('OUT/2026'),invoice('2026-10')],'2026-10-29'),1);
 assert.equal(faturasVencidasSemPagamento(uc,[invoice('OUT/2026',{vencimento:'2026-10-29'}),invoice('NOV/2026',{vencimento:'2026-11-01'})],'2026-10-29'),0);
});
test('pagamento da fatura ou confirmado no provedor libera contagem; cancelada/rascunho não contam',()=>{
 for(const extra of [{status:'PAGO'},{status:'CANCELADA'},{status:'RASCUNHO'},{cobrancas:[{status:'RECEIVED'}]},{cobrancas:[{status:'PAGA',pago_em:'2026-10-20'}]}])assert.equal(faturasVencidasSemPagamento(uc,[invoice('OUT/2026',extra)],'2026-10-29'),0);
 assert.equal(faturasVencidasSemPagamento(uc,[invoice('OUT/2026',{cobrancas:[{status:'CANCELADA'},{status:'PENDING'}]})],'2026-10-29'),1);
});
test('não mistura outra UC nem outro cliente; números legados são normalizados',()=>{
 assert.equal(faturasVencidasSemPagamento(uc,[invoice('SET/2026',{cliente_id:'outro'}),invoice('OUT/2026',{unidade_consumidora_id:'outra'})],'2026-10-29'),0);
 assert.equal(faturasVencidasSemPagamento(uc,[invoice('OUT/2026',{unidade_consumidora_id:null,numero_instalacao:'12.345.678'})],'2026-10-29'),1);
});
