import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument, PDFDict, PDFName } from "@cantoo/pdf-lib";
import { prepararPdfParaDownload } from "../pdfDownload.service";

async function exemplo(assinada = false) {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 300]).drawText("Conta da concessionaria");
  if (assinada) {
    const assinatura = pdf.context.obj({ Type: "Sig", ByteRange: [0, 12, 20, 40] });
    pdf.catalog.set(PDFName.of("Perms"), pdf.context.register(assinatura));
  }
  pdf.encrypt({ userPassword: "teste-0784", ownerPassword: "proprietario-teste" });
  return Buffer.from(await pdf.save());
}

test("gera cópia sem senha e mantém o original protegido", async () => {
  const original = await exemplo();
  const copia = await prepararPdfParaDownload(original, ["errada", "teste-0784"]);
  assert.notEqual(copia, original);
  assert.equal((await PDFDocument.load(copia)).isEncrypted, false);
  assert.equal((await PDFDocument.load(copia)).getPageCount(), 1);
  assert.equal((await PDFDocument.load(original, { ignoreEncryption: true })).isEncrypted, true);
});

test("não reescreve PDF assinado nem original sem senha conhecida", async () => {
  const assinado = await exemplo(true);
  assert.equal(await prepararPdfParaDownload(assinado, ["teste-0784"]), assinado);
  const protegido = await exemplo();
  assert.equal(await prepararPdfParaDownload(protegido, ["errada"]), protegido);
});

test("não modifica conta já sem proteção", async () => {
  const documento = await PDFDocument.create();
  documento.addPage();
  const original = Buffer.from(await documento.save());
  assert.equal(await prepararPdfParaDownload(original), original);
});
