import assert from "node:assert/strict";
import test from "node:test";
import { AsaasHttpError } from "./asaas.client";
import { falhaRepasse, pagamentoDisponivelParaRepasse } from "./repasse.policy";

test("só libera repasse após disponibilidade do saldo, não na confirmação", () => {
  assert.equal(pagamentoDisponivelParaRepasse("CONFIRMED"),false);
  assert.equal(pagamentoDisponivelParaRepasse("RECEIVED"),true);
  for(const estado of ["PENDING","REFUNDED",null,"PAYMENT_CONFIRMED"]) assert.equal(pagamentoDisponivelParaRepasse(estado),false);
});
test("timeout e erro de servidor reservam o saldo como resultado incerto", () => {
  assert.equal(falhaRepasse(new Error("timeout")).status,"UNKNOWN");
  assert.equal(falhaRepasse(new AsaasHttpError(500,"server_error","erro")).status,"UNKNOWN");
});
test("rejeição explícita é preservada sem expor descrição sensível", () => {
  assert.deepEqual(falhaRepasse(new AsaasHttpError(400,"insufficient_balance","dados privados")),{status:"REFUSED",erro_codigo:"insufficient_balance"});
});
