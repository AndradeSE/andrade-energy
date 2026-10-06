import assert from "node:assert/strict";
import test from "node:test";
import { asksLatestInvoiceDocument, invoiceDocumentChoices } from "./local-assistant-invoices";
test("pedido de PDF não exige última e emissão não vira consulta", () => {
  assert.equal(asksLatestInvoiceDocument("Envie o PDF da fatura"), true);
  assert.equal(asksLatestInvoiceDocument("Quero gerar uma fatura"), false);
  const invoices = [{ id: "a", referencia: "2026-09", created_at: "2026-10-01" }, { id: "b", referencia: "2026-08", created_at: "2026-09-01" }];
  assert.equal(invoiceDocumentChoices("PDF de agosto de 2026", invoices)[0].id, "b");
  assert.equal(invoiceDocumentChoices("PDF de julho de 2026", invoices).length, 0);
  assert.equal(invoiceDocumentChoices("Minha última fatura", invoices)[0].id, "a");
});
