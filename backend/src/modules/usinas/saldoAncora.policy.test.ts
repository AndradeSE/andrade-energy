import assert from "node:assert/strict";
import test from "node:test";
import {saldoCreditoInformado,ultimoSaldoAncora} from "./saldoAncora.policy";

test("saldo distingue zero explicitamente informado de campo ausente e rejeita valores inválidos",()=>{
  assert.equal(saldoCreditoInformado(0),null);
  assert.equal(saldoCreditoInformado(0,true),0);
  assert.equal(saldoCreditoInformado(null,true),null);
  assert.equal(saldoCreditoInformado("",true),null);
  assert.equal(saldoCreditoInformado(-1,true),null);
  assert.equal(saldoCreditoInformado("1.234,56",true),1234.56);
  assert.equal(saldoCreditoInformado(100,false),null);
});
test("saldo é a última leitura válida até a competência, sem somar saldos ou projeções",()=>{
  const leituras=[{saldo:100,referencia:"AGO/2026"},{saldo:300,referencia:"SET/2026"},{saldo:900,referencia:"NOV/2026"},{saldo:0,referencia:"OUT/2026"}];
  assert.deepEqual(ultimoSaldoAncora(leituras,"2026-10"),{saldoKwh:300,referencia:"2026-09"});
  assert.deepEqual(ultimoSaldoAncora([...leituras,{saldo:0,referencia:"OUT/2026",informado:true}],"2026-10"),{saldoKwh:0,referencia:"2026-10"});
  assert.deepEqual(ultimoSaldoAncora([],"2026-10"),{saldoKwh:null,referencia:null});
});
