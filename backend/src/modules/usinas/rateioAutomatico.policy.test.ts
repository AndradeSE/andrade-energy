import assert from "node:assert/strict";
import test from "node:test";
import {competenciaRateioCompleta,contratoElegivelParaRateio,recebimentosSuspensosParaFechamento} from "./rateioAutomatico.policy";
test("minutas, cancelados e assinatura externa pendente não são UCs esperadas",()=>{
  assert.equal(contratoElegivelParaRateio({status:"ATIVO"}),false);
  assert.equal(contratoElegivelParaRateio({status:"CANCELADO",aceite_cliente_em:"data"}),false);
  assert.equal(contratoElegivelParaRateio({status:"VIGENTE",dados_documento:{assinatura_externa_pendente:true}}),false);
  assert.equal(contratoElegivelParaRateio({status:"ATIVO",aceite_cliente_em:"data"}),true);
});
test("rateio aguarda produção e todas as UCs; duplicatas, outro cliente, outra UC e outro mês não completam",()=>{
  const u=[{id:"a",numero:"111111",cliente_id:"c"},{id:"b",numero:"222222",cliente_id:"c"}];
  const p=[{competencia:"2026-10-01",energia_gerada:10000,energia_gerada_fatura:10000,fatura_usina_validada_em:"2026-10-01T00:00:00Z"}];
  const f=[{numero_instalacao:"111111",cliente_id:"c",referencia:"OUT/2026",status:"ABERTA"}];
  const segunda={numero_instalacao:"222222",cliente_id:"c",referencia:"2026-10",status:"PAGO"};
  assert.equal(competenciaRateioCompleta("2026-10",u,[...f,...f],p),false);
  assert.equal(competenciaRateioCompleta("2026-10",u,[...f,segunda],[]),false);
  for(const diferenca of [{cliente_id:"outro"},{referencia:"SET/2026"},{status:"RASCUNHO"},{status:"CANCELADA"}]) assert.equal(competenciaRateioCompleta("2026-10",u,[...f,{...segunda,...diferenca}],p),false);
  assert.equal(competenciaRateioCompleta("2026-10",u,[...f,segunda],p),true);
  assert.equal(competenciaRateioCompleta("2026-10",[],f,p),false);
});


test('anexo de cadastro não completa fechamento; somente faturamento ou leitura processada em suspensão',()=>{
 const unidades=[{id:'uc1',numero:'111111',cliente_id:'c1'},{id:'uc2',numero:'222222',cliente_id:'c2'}];
 const producoes=[{competencia:'2026-10-01',energia_gerada:1000,energia_gerada_fatura:1000,fatura_usina_validada_em:"2026-10-01T00:00:00Z"}];
 const faturada={numero_instalacao:'111111',cliente_id:'c1',referencia:'OUT/2026',status:'ABERTA'};
 const cadastro={cliente_id:'c2',dados_fatura:{uc:'222222',referencia:'OUT/2026'}};
 assert.equal(competenciaRateioCompleta('2026-10',unidades,[faturada,...recebimentosSuspensosParaFechamento([cadastro],'e','u')],producoes),false);
 const suspensa={empresa_id:'e',status:'PROCESSADO',unidade_consumidora_id:'uc2',payload:{andrade_processamento:{tipo:'FATURAMENTO_SUSPENSO',competencia:'OUT/2026'}},unidades_consumidoras:{numero:'222222',cliente_id:'c2',usina_id:'u'}};
 assert.equal(competenciaRateioCompleta('2026-10',unidades,[faturada,...recebimentosSuspensosParaFechamento([suspensa],'e','u')],producoes),true);
 for(const invalido of [{...suspensa,status:'PENDENTE'},{...suspensa,empresa_id:'outra'},{...suspensa,unidades_consumidoras:{...suspensa.unidades_consumidoras,usina_id:'outra'}},{...suspensa,payload:{}}])assert.equal(recebimentosSuspensosParaFechamento([invalido],'e','u').length,0);
});

test('toda UC ativa permanece esperada mesmo se ainda não houver faturamento ou cliente associado',()=>{
 const u=[{id:'a',numero:'111111',cliente_id:'c1'},{id:'b',numero:'222222',cliente_id:'c2'}];
 const f=[{numero_instalacao:'111111',cliente_id:'c1',referencia:'OUT/2026',status:'ABERTA'}];
 const p=[{competencia:'2026-10-01',energia_gerada:1000,energia_gerada_fatura:1000,fatura_usina_validada_em:"2026-10-01T00:00:00Z"}];
 assert.equal(competenciaRateioCompleta('2026-10',u,f,p),false);
 assert.equal(competenciaRateioCompleta('2026-10',[{...u[0],cliente_id:''}],f,p),false);
});


test('produção digitada, fatura de outro mês e produção divergente não liberam rateio',()=>{
 const u=[{id:'a',numero:'111111',cliente_id:'c1'}],f=[{numero_instalacao:'111111',cliente_id:'c1',referencia:'OUT/2026',status:'ABERTA'}];
 const p={competencia:'2026-10-01',energia_gerada:1000,energia_gerada_fatura:1000,fatura_usina_validada_em:'2026-10-01T00:00:00Z'};
 assert.equal(competenciaRateioCompleta('2026-10',u,f,[p]),true);
 for(const mudanca of [{fatura_usina_validada_em:null},{energia_gerada_fatura:null},{energia_gerada:2000},{competencia:'2026-09-01'}])assert.equal(competenciaRateioCompleta('2026-10',u,f,[{...p,...mudanca}]),false);
});
