import assert from "node:assert/strict";
import { test } from "node:test";
import { changedFields, checkoutKey, contractEndDate, hasVerifiedSignature, safeRead, safeRemove, safeWrite, securePaymentUrl, sessionAccessType, validWalletResponse } from "../src/flowSafety.ts";

test("uploaded PDF does not release a contract before verification", () => {
  assert.equal(hasVerifiedSignature({ contrato_assinado_url: "https://example.test/file.pdf", dados_documento: { assinatura_externa_pendente: true } }), false);
  assert.equal(hasVerifiedSignature({ aceite_cliente_em: "2026-10-09" }), true);
  assert.equal(hasVerifiedSignature({ contrato_assinado_url: "https://example.test/file.pdf", dados_documento: { assinatura_externa_validada_em: "2026-10-09" } }), true);
  assert.equal(hasVerifiedSignature(null), false);
  assert.equal(hasVerifiedSignature({ status: "VIGENTE" }), false);
  assert.equal(hasVerifiedSignature({ status: "VIGENTE", contrato_assinado_url: "https://example.test/file.pdf" }), true);
  assert.equal(hasVerifiedSignature({ status: "VIGENTE", contrato_assinado_url: "https://example.test/file.pdf", dados_documento: { aceite_cliente_exigido: true, assinatura_externa_validada_em: "2026-10-09" } }), false);
  assert.equal(hasVerifiedSignature({ status: "VIGENTE", dados_documento: { assinatura_externa_pendente: true } }), false);
});
test("clearing dates and invalid periods cannot crash contract rendering", () => {
  for (const date of ["", "invalid", "2026-02-30"]) assert.equal(contractEndDate(date, 10), "");
  for (const years of [NaN, -1, 0, 1.5, 101]) assert.equal(contractEndDate("2026-10-09", years), "");
  assert.equal(contractEndDate("2024-02-29", 1), "2025-02-28");
  assert.equal(contractEndDate("2026-10-09", 10), "2036-10-09");
});
test("editing a name preserves unset financial fields", () => {
  assert.deepEqual(changedFields({ nome: "Nova", investimento: "" }, { nome: "Antiga", investimento: "" }, new Set(["investimento"])), { nome: "Nova" });
  for (const investimento of ["", "abc", "-1"]) assert.throws(() => changedFields({ investimento }, { investimento: "100" }, new Set(["investimento"])));
  assert.deepEqual(changedFields({ investimento: "0" }, { investimento: "100" }, new Set(["investimento"])), { investimento: 0 });
});
test("malformed checkout fragment falls back without crashing", () => {
  const fallback = "11111111-1111-4111-8111-111111111111";
  assert.equal(checkoutKey("#%E0%A4%A", null, fallback), fallback);
  assert.equal(checkoutKey("#short", null, fallback), fallback);
  assert.equal(checkoutKey(`#${fallback}`, null, "unused"), fallback);
});
test("blocked browser storage does not abort a flow", () => {
  const blocked = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceededError"); }, removeItem() { throw new Error("SecurityError"); } } as unknown as Storage;
  assert.equal(safeRead(blocked, "key"), null);
  assert.equal(safeWrite(blocked, "key", "value"), false);
  assert.doesNotThrow(() => safeRemove(blocked, "key"));
});
test("checkout only navigates to secure provider URLs", () => {
  for (const url of ["javascript:alert(1)", "http://example.test", "https://user:secret@example.test", undefined]) assert.throws(() => securePaymentUrl(url));
  assert.equal(securePaymentUrl("https://payments.example.test/checkout"), "https://payments.example.test/checkout");
});
test("server profile controls the portal regardless of stale browser metadata", () => {
  assert.equal(sessionAccessType("LEITURA"), "CONSUMIDOR");
  assert.equal(sessionAccessType("GESTOR"), "GERADOR");
  assert.equal(sessionAccessType("ADMIN"), "GERADOR");
  for (const profile of [undefined, "", "unexpected"]) assert.equal(sessionAccessType(profile), null);
});

test("partial wallet responses cannot crash the home or show an invented balance", () => {
  assert.equal(Boolean(validWalletResponse({})), false);
  assert.equal(Boolean(validWalletResponse(null)), false);
  const valid = { saldoDisponivel: 0, saldoPendente: 10, totalRecebido: 100, totalTransferido: 90, transferencias: [] };
  assert.equal(validWalletResponse(valid), true);
  assert.equal(validWalletResponse({...valid, saldoDisponivel: NaN}), false);
  assert.equal(validWalletResponse({...valid, transferencias: {}}), false);
});
