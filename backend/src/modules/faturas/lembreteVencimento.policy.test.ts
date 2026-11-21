import test from "node:test";
import assert from "node:assert/strict";
import { avisoCobrancaVencida, diasParaLembreteFatura } from "./lembreteVencimento.policy";
test("lembrete entra cinco dias antes, recupera dias perdidos e inclui o vencimento", () => {
  const f = { status: "ABERTA", vencimento: "2026-10-16" };
  assert.equal(diasParaLembreteFatura(f, "2026-10-10"), null);
  assert.equal(diasParaLembreteFatura(f, "2026-10-11"), 5);
  assert.equal(diasParaLembreteFatura(f, "2026-10-15"), 1);
  assert.equal(diasParaLembreteFatura(f, "2026-10-16"), 0);
  assert.equal(diasParaLembreteFatura(f, "2026-10-17"), null);
});

test("cobrança vencida usa o dia local para permitir um aviso por dia", () => {
  const f = { status: "ABERTA", vencimento: "2026-10-01" };
  assert.equal(avisoCobrancaVencida(f, "2026-10-01"), null);
  for (const [hoje, dias] of [["2026-10-02", 1], ["2026-10-07", 6], ["2026-10-08", 7], ["2026-10-17", 16], ["2026-10-31", 30], ["2026-11-30", 60]] as const)
    assert.deepEqual(avisoCobrancaVencida(f, hoje), { dias, diaDoAviso: hoje });
});

test("cobrança vencida não cobra paga, cancelada, rascunho ou recebida no provedor", () => {
  for (const status of ["PAGO", "PAGA", "CANCELADA", "RASCUNHO", "ANEXADA"])
    assert.equal(avisoCobrancaVencida({ status, vencimento: "2026-10-01" }, "2026-10-21"), null);
  for (const status of ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "CANCELADA", "DELETED", "REFUNDED"])
    assert.equal(avisoCobrancaVencida({ status: "ABERTA", vencimento: "2026-10-01", cobrancas: [{ status }] }, "2026-10-21"), null);
  assert.equal(avisoCobrancaVencida({ status: "ABERTA", vencimento: "inválido" }, "2026-10-21"), null);
  assert.equal(avisoCobrancaVencida({ status: "ABERTA", vencimento: "2026-10-01", cobrancas: [{ status: "PENDENTE", pago_em: "2026-10-02" }] }, "2026-10-21"), null);
});
test("rascunho, paga, cancelada e cobrança já recebida não são lembrados", () => {
  for (const status of ["RASCUNHO", "PAGA", "CANCELADA", "ANEXADA"])
    assert.equal(diasParaLembreteFatura({ status, vencimento: "2026-10-16" }, "2026-10-11"), null);
  for (const status of ["RECEIVED", "CONFIRMED", "CANCELADA", "REFUNDED"])
    assert.equal(diasParaLembreteFatura({ status: "ABERTA", vencimento: "2026-10-16", cobrancas: [{ status }] }, "2026-10-11"), null);
});
