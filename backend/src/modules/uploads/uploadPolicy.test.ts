import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_PDF_BYTES, validatePdfMetadata, validatePdfBytes } from "./uploadPolicy";

test("PDF metadata refuses oversized, fractional, non-PDF or empty files", () => {
  for (const tamanho of [0, -1, 1.5, MAX_PDF_BYTES + 1, "100"]) {
    assert.throws(() => validatePdfMetadata({ nome: "a.pdf", tamanho, tipo: "application/pdf" }));
  }
  assert.throws(() => validatePdfMetadata({ nome: "a.exe", tamanho: 100, tipo: "application/pdf" }));
  assert.equal(validatePdfMetadata({ nome: "../../private/a.pdf", tamanho: MAX_PDF_BYTES, tipo: "application/pdf" }).nome, "a.pdf");
});
test("PDF bytes must match declared length and file signature", () => {
  const pdf = Buffer.from("%PDF-1.4\nsynthetic");
  validatePdfBytes(pdf, pdf.length);
  assert.throws(() => validatePdfBytes(pdf, pdf.length + 1));
  assert.throws(() => validatePdfBytes(Buffer.from("executable"), 10));
});
