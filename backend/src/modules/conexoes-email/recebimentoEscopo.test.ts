import assert from "node:assert/strict";
import { test } from "node:test";
import { unidadesNoEscopoRecebimento } from "../recebimento-faturas/recebimentoEscopo.policy";

const unidade = (id: string, cliente_id: string, titularidade = "GERADOR", empresa_id = "e1") => ({
  id, cliente_id, empresa_id, tipo: "BENEFICIARIA", usinas: { titularidade_ucs_recebedoras: titularidade },
});

test("Gmail do consumidor só importa UCs do próprio cliente e empresa", () => {
  const origem = unidade("uc1", "cliente1", "CLIENTE");
  const propria = unidade("uc2", "cliente1", "CLIENTE");
  assert.deepEqual(unidadesNoEscopoRecebimento(origem, [propria,
    unidade("uc3", "cliente2", "CLIENTE"), unidade("uc4", "cliente1", "CLIENTE", "e2"),
    unidade("uc5", "cliente1", "GERADOR"),
  ]), [propria]);
});

test("Gmail do gerador não inclui UCs de titularidade cliente ou outra empresa", () => {
  const origem = unidade("uc1", "cliente1");
  const propria = unidade("uc2", "cliente2");
  assert.deepEqual(unidadesNoEscopoRecebimento(origem, [propria,
    unidade("uc3", "cliente3", "CLIENTE"), unidade("uc4", "cliente4", "GERADOR", "e2"),
  ]), [propria]);
});

test("conta da geradora só alimenta produção da própria UC", () => {
  const origem = { ...unidade("geradora", "titular"), tipo: "GERADORA" };
  assert.deepEqual(unidadesNoEscopoRecebimento(origem, [unidade("cliente", "cliente")]), [origem]);
});

test('leitura do gerador também encaminha produção somente da própria usina e empresa',()=>{
 const origem={...unidade('beneficiaria','titular'),usina_id:'usina1'};
 const geradora={...unidade('geradora','titular'),tipo:'GERADORA',usina_id:'usina1'};
 assert.deepEqual(unidadesNoEscopoRecebimento(origem,[geradora,{...geradora,id:'outra',usina_id:'usina2'},{...geradora,empresa_id:'e2'}]),[geradora]);
 const consumidor={...origem,usinas:{titularidade_ucs_recebedoras:'CLIENTE'}};
 assert.deepEqual(unidadesNoEscopoRecebimento(consumidor,[{...geradora,cliente_id:'titular',usinas:{titularidade_ucs_recebedoras:'CLIENTE'}}]),[]);
});
