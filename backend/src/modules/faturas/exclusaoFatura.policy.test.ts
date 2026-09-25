import test from "node:test";
import assert from "node:assert/strict";
import { cobrancaAsaasPodeSerExcluida } from "./exclusaoFatura.policy";

test("somente cobranças pendentes ou vencidas podem ser canceladas ao apagar a fatura", () => {
  assert.equal(cobrancaAsaasPodeSerExcluida("PENDING"), true);
  assert.equal(cobrancaAsaasPodeSerExcluida("OVERDUE"), true);
  for (const status of ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "REFUNDED", "AWAITING_RISK_ANALYSIS", null]) {
    assert.equal(cobrancaAsaasPodeSerExcluida(status), false);
  }
});
