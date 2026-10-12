import test from "node:test";
import assert from "node:assert/strict";
import { diasParaLembreteFatura } from "./lembreteVencimento.policy";
test("lembrete entra cinco dias antes, recupera dias perdidos e inclui o vencimento", () => {
  const f = { status: "ABERTA", vencimento: "2026-10-16" };
  assert.equal(diasParaLembreteFatura(f, "2026-10-10"), null);
  assert.equal(diasParaLembreteFatura(f, "2026-10-11"), 5);
  assert.equal(diasParaLembreteFatura(f, "2026-10-15"), 1);
  assert.equal(diasParaLembreteFatura(f, "2026-10-16"), 0);
  assert.equal(diasParaLembreteFatura(f, "2026-10-17"), null);
});
test("rascunho, paga, cancelada e cobrança já recebida não são lembrados", () => {
  for (const status of ["RASCUNHO", "PAGA", "CANCELADA", "ANEXADA"])
    assert.equal(diasParaLembreteFatura({ status, vencimento: "2026-10-16" }, "2026-10-11"), null);
  for (const status of ["RECEIVED", "CONFIRMED", "CANCELADA", "REFUNDED"])
    assert.equal(diasParaLembreteFatura({ status: "ABERTA", vencimento: "2026-10-16", cobrancas: [{ status }] }, "2026-10-11"), null);
});
