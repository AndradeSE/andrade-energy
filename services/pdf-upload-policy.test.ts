import assert from "node:assert/strict";
import { test } from "node:test";
import { pdfUploadMetadata, validatePreviewPdfUpload } from "./pdf-upload-policy";
import { validatePdfMetadata } from "../backend/src/modules/uploads/uploadPolicy";

test("native upload preparation satisfies the backend contract for a 7 MB PDF", () => {
  const metadata = pdfUploadMetadata("Teste_contingencia_7MB.pdf", 7 * 1024 * 1024);
  assert.deepEqual(validatePdfMetadata(metadata), { nome: metadata.nome, tamanho: metadata.tamanho });
  assert.throws(() => validatePdfMetadata({ nome: metadata.nome, tamanho: metadata.tamanho }));
});
test("PDF upload refuses substituted destinations, tickets and oversized files before sending bytes", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const path = `/storage/v1/object/upload/sign/contingency-uploads/${id}/${id}/${id}.pdf?token=test`;
  const ticket = { uploadId: id, uploadUrl: `https://qqhcjieymypowunkixmk.supabase.co${path}` };
  assert.equal(validatePreviewPdfUpload(ticket, 7 * 1024 * 1024), ticket);
  const production={...ticket,uploadUrl:ticket.uploadUrl.replace('qqhcjieymypowunkixmk','ehnkyrsseisvvtbkwrvu')};
  assert.equal(validatePreviewPdfUpload(production,7*1024*1024,'production'),production);
  assert.throws(()=>validatePreviewPdfUpload(ticket,10,'production'));
  assert.throws(()=>validatePreviewPdfUpload(production,10,'preview'));
  for (const uploadUrl of [ticket.uploadUrl.replace("supabase.co", "supabase.co.evil.test"), ticket.uploadUrl.replace("https:", "http:"),
    ticket.uploadUrl.replace("contingency-uploads", "private"), ticket.uploadUrl.replace("?token=test", ""), ticket.uploadUrl.replace(".co/", ".co:8443/")]) {
    assert.throws(() => validatePreviewPdfUpload({ ...ticket, uploadUrl }, 10));
  }
  assert.throws(() => validatePreviewPdfUpload({ ...ticket, uploadId: "another-id" }, 10));
  for (const size of [0, -1, NaN, 10 * 1024 * 1024 + 1]) assert.throws(() => validatePreviewPdfUpload(ticket, size));
});
