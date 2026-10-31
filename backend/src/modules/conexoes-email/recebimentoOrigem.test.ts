import assert from "node:assert/strict";
import { test } from "node:test";
import { origemEmailPermitida } from "../recebimento-faturas/recebimentoOrigem.policy";

test("caixa de UC pendente permanece configurável sem liberar unidades canceladas", () => {
  assert.equal(origemEmailPermitida({ tipo: "BENEFICIARIA", status: "PENDENTE_CONTRATO" }), true);
  assert.equal(origemEmailPermitida({ tipo: "GERADORA", status: "ATIVA" }), true);
  for (const status of ["CANCELADA", "INATIVA", "EXCLUIDA", "SUSPENSA", ""]) {
    assert.equal(origemEmailPermitida({ tipo: "BENEFICIARIA", status }), false);
  }
  assert.equal(origemEmailPermitida({ tipo: "GERADORA", status: "PENDENTE_CONTRATO" }), false);
  assert.equal(origemEmailPermitida(null), false);
});
