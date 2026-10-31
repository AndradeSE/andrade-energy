import assert from "node:assert/strict";
import { test } from "node:test";
import { origemEmailPermitida, pdfDeOutraUcNaGeradora } from "../recebimento-faturas/recebimentoOrigem.policy";

test("caixa de UC pendente permanece configurável sem liberar unidades canceladas", () => {
  assert.equal(origemEmailPermitida({ tipo: "BENEFICIARIA", status: "PENDENTE_CONTRATO" }), true);
  assert.equal(origemEmailPermitida({ tipo: "GERADORA", status: "ATIVA" }), true);
  for (const status of ["CANCELADA", "INATIVA", "EXCLUIDA", "SUSPENSA", ""]) {
    assert.equal(origemEmailPermitida({ tipo: "BENEFICIARIA", status }), false);
  }
  assert.equal(origemEmailPermitida({ tipo: "GERADORA", status: "PENDENTE_CONTRATO" }), false);
  assert.equal(origemEmailPermitida(null), false);
});


test('conta de cliente na caixa compartilhada não significa falha da produção',()=>{
 const geradora={tipo:'GERADORA',numero:'1121361801894'};
 assert.equal(pdfDeOutraUcNaGeradora(geradora,'12.227.902.018-27'),true);
 assert.equal(pdfDeOutraUcNaGeradora(geradora,'11.213.618.018-94'),false);
 assert.equal(pdfDeOutraUcNaGeradora(geradora,undefined),false);
 assert.equal(pdfDeOutraUcNaGeradora({...geradora,tipo:'BENEFICIARIA'},'1222790201827'),false);
});
