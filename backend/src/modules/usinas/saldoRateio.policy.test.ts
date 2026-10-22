import assert from "node:assert/strict";
import test from "node:test";
import {saldoAnteriorParaRateio} from "./saldoRateio.policy";
import {proporRateioMensal,csvCemigRateio} from "./rateioMensal.policy";
test("saldo abate somente a necessidade: 1000 de consumo menos 400 resulta em 6% de 10000",()=>{
  const p=proporRateioMensal(10000,[{numero:"123456789",consumo_medio_kwh:1000,saldo_atual_kwh:400}]);
  assert.equal(p.linhas[0].necessidade,600);assert.equal(p.linhas[0].percentual,6);assert.equal(p.linhas[1].percentual,94);
});
test("saldo suficiente retira a beneficiária do CSV sem cancelar contrato, deixando sobra na âncora",()=>{
  const p=proporRateioMensal(10000,[{numero:"123456789",documento:"52998224725",consumo_medio_kwh:1000,saldo_atual_kwh:1400}],"987654321");
  assert.equal(p.suspensas.length,1);assert.equal(p.linhas.length,1);assert.equal(p.linhas[0].percentual,100);
  assert.equal(csvCemigRateio(p,"456789123","52998224725",true),"987654321;52998224725;100;X");
});
test("saldo nunca migra entre as duas UCs do cliente e não usa faturas futuras ou ausentes",()=>{
  const leituras:any[]=[
    {numero:"123456789",clienteId:"rodrigo",referencia:"SET/2026",saldo:400,fonte:"FATURA"},
    {numero:"987654321",clienteId:"rodrigo",referencia:"OUT/2026",saldo:5000,fonte:"FATURA"},
    {numero:"123456789",clienteId:"rodrigo",referencia:"NOV/2026",saldo:9000,fonte:"FATURA"},
    {numero:"123456789",clienteId:"outro",referencia:"OUT/2026",saldo:8000,fonte:"FATURA"},
  ];
  assert.equal(saldoAnteriorParaRateio("123456789","rodrigo","2026-10",leituras).saldo,400);
  assert.equal(saldoAnteriorParaRateio("123456789","rodrigo","2026-10",leituras).referencia,"2026-09");
  assert.equal(saldoAnteriorParaRateio("111222333","rodrigo","2026-10",leituras).semHistorico,true);
});
