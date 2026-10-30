import assert from "node:assert/strict";
import test from "node:test";
import {currentUnitEnergyBalance} from "./uc-energy-balance";
test("saldo das duas UCs não se mistura; zero válido prevalece sobre saldo antigo",()=>{
  const invoices=[{numero_instalacao:"111111",cliente_id:"c",referencia:"SET/2026",saldo_atual:100},{numero_instalacao:"222222",cliente_id:"c",referencia:"OUT/2026",saldo_atual:900},{numero_instalacao:"111111",cliente_id:"c",referencia:"OUT/2026",saldo_atual:0}];
  assert.equal(currentUnitEnergyBalance("111111","c",invoices,[])?.balance,0);
  assert.equal(currentUnitEnergyBalance("111111","outro",invoices,[]),undefined);
  assert.equal(currentUnitEnergyBalance("333333","c",invoices,[]),undefined);
});
test("conta original da mesma UC prevalece no período e aceita decimal brasileiro",()=>{
  assert.equal(currentUnitEnergyBalance("111111","c",[{numero_instalacao:"111111",referencia:"2026-10",saldo_atual:10}], [{dadosFatura:{uc:"111111",referencia:"OUT/2026",saldoAtual:"1.234,56"}}])?.balance,1234.56);
  assert.equal(currentUnitEnergyBalance("111111","c",[{numero_instalacao:"111111",referencia:"OUT/2026",saldo_atual:null}],[]),undefined);
});
