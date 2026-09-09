import assert from "node:assert/strict";
import test from "node:test";
import { statusAssinaturaPorEvento } from "./assinaturaStatus";

test("ativa a assinatura quando o pagamento é confirmado ou recebido", () => {
  assert.equal(statusAssinaturaPorEvento("PAYMENT_CONFIRMED"), "ATIVA");
  assert.equal(statusAssinaturaPorEvento("PAYMENT_RECEIVED"), "ATIVA");
});

test("marca inadimplência quando a cobrança vence", () => {
  assert.equal(statusAssinaturaPorEvento("PAYMENT_OVERDUE"), "INADIMPLENTE");
});

test("suspende acesso após exclusão ou estorno da cobrança", () => {
  assert.equal(statusAssinaturaPorEvento("PAYMENT_DELETED"), "SUSPENSA");
  assert.equal(statusAssinaturaPorEvento("PAYMENT_REFUNDED"), "SUSPENSA");
  assert.equal(statusAssinaturaPorEvento("PAYMENT_REFUND_IN_PROGRESS"), "SUSPENSA");
});

test("ignora eventos que não alteram a assinatura", () => {
  assert.equal(statusAssinaturaPorEvento("PAYMENT_CREATED"), null);
});
