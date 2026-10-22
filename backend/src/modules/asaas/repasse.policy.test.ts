import assert from "node:assert/strict";
import test from "node:test";
import { AsaasHttpError } from "./asaas.client";
import { falhaRepasse, pagamentoDisponivelParaRepasse, saldoDisponivelConfirmado } from "./repasse.policy";
test("disponível exige saldo real, desconta reservas e não usa saldo de outras carteiras",()=>{
  assert.equal(saldoDisponivelConfirmado(386.45,0,null),0);
  assert.equal(saldoDisponivelConfirmado(386.45,0,0),0);
  assert.equal(saldoDisponivelConfirmado(386.45,100,500),286.45);
  assert.equal(saldoDisponivelConfirmado(386.45,0,200),200);
  assert.equal(saldoDisponivelConfirmado(0,0,500),0);
});

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
