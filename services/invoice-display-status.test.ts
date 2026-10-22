import assert from "node:assert/strict";
import test from "node:test";
import { invoiceDisplayStatus } from "./invoice-display-status";
const hoje = "2026-10-21";
test("baixa da fatura prevalece sobre cobrança auxiliar aberta", () => {
  const status = invoiceDisplayStatus({status:"PAGO",vencimento:"2026-10-17",cobrancas:[{status:"ABERTA"}]},hoje);
  assert.equal(status.label,"Paga"); assert.equal(status.vencida,false);
});
test("pagamento confirmado em qualquer cobrança é reconhecido", () => {
  assert.equal(invoiceDisplayStatus({status:"ABERTA",cobrancas:[{status:"PENDING"},{status:"CONFIRMED"}]},hoje).paga,true);
});
test("pendente vencida, vencimento hoje e cancelamento são distintos", () => {
  assert.equal(invoiceDisplayStatus({status:"ABERTA",vencimento:"2026-10-20"},hoje).label,"Vencida");
  assert.equal(invoiceDisplayStatus({status:"ABERTA",vencimento:hoje},hoje).label,"Em aberto");
  assert.equal(invoiceDisplayStatus({status:"CANCELADA",vencimento:"2026-10-20"},hoje).label,"Cancelada");
});
