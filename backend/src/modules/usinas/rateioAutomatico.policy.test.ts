import assert from "node:assert/strict";
import test from "node:test";
import {competenciaRateioCompleta,contratoElegivelParaRateio} from "./rateioAutomatico.policy";
test("minutas, cancelados e assinatura externa pendente não são UCs esperadas",()=>{
  assert.equal(contratoElegivelParaRateio({status:"ATIVO"}),false);
  assert.equal(contratoElegivelParaRateio({status:"CANCELADO",aceite_cliente_em:"data"}),false);
  assert.equal(contratoElegivelParaRateio({status:"VIGENTE",dados_documento:{assinatura_externa_pendente:true}}),false);
  assert.equal(contratoElegivelParaRateio({status:"ATIVO",aceite_cliente_em:"data"}),true);
});
test("rateio aguarda produção e todas as UCs; duplicatas, outro cliente, outra UC e outro mês não completam",()=>{
  const u=[{id:"a",numero:"111111",cliente_id:"c"},{id:"b",numero:"222222",cliente_id:"c"}];
  const p=[{competencia:"2026-10-01",energia_gerada:10000}];
  const f=[{numero_instalacao:"111111",cliente_id:"c",referencia:"OUT/2026",status:"ABERTA"}];
  const segunda={numero_instalacao:"222222",cliente_id:"c",referencia:"2026-10",status:"PAGO"};
  assert.equal(competenciaRateioCompleta("2026-10",u,[...f,...f],p),false);
  assert.equal(competenciaRateioCompleta("2026-10",u,[...f,segunda],[]),false);
  for(const diferenca of [{cliente_id:"outro"},{referencia:"SET/2026"},{status:"RASCUNHO"},{status:"CANCELADA"}]) assert.equal(competenciaRateioCompleta("2026-10",u,[...f,{...segunda,...diferenca}],p),false);
  assert.equal(competenciaRateioCompleta("2026-10",u,[...f,segunda],p),true);
  assert.equal(competenciaRateioCompleta("2026-10",[],f,p),false);
});
