import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { Request } from "express";
import { supabase } from "../../config/supabase";
import { uploadDirectory } from "../../config/uploadDirectory";
import { MAX_PDF_BYTES, UPLOAD_BUCKET, validatePdfBytes, validatePdfMetadata, PdfUploadPreparationError } from "./uploadPolicy";

export async function preparePdfUpload(req: Request) {
  const user = (req as any).usuario;
  const metadata = validatePdfMetadata(req.body ?? {});
  if (!user?.id || !user?.empresa_id) throw new PdfUploadPreparationError("UPLOAD_SCOPE_INVALID");
  const id = randomUUID();
  const key = `${user.empresa_id}/${user.id}/${id}.pdf`;
  const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(key, { upsert: false });
  if (error || !data) throw new PdfUploadPreparationError("UPLOAD_STORAGE_UNAVAILABLE");
  const inserted = await supabase.from("uploads_contingencia").insert({
    id, empresa_id: user.empresa_id, usuario_id: user.id, caminho: key,
    nome: metadata.nome, tamanho: metadata.tamanho,
  });
  if (inserted.error) throw new PdfUploadPreparationError("UPLOAD_TICKET_UNAVAILABLE");
  return { uploadId: id, uploadUrl: data.signedUrl, expiresIn: 900, maxBytes: MAX_PDF_BYTES };
}

export async function consumePdfUpload(req: Request, field: string) {
  const user = (req as any).usuario;
  const id = String(req.body?.uploadedFileId ?? "");
  if (!user?.id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Envio não autorizado.");
  // Atomic, single-use claim is bound to BOTH the authenticated user and company.
  const { data: ticket, error } = await supabase.from("uploads_contingencia")
    .update({ consumido_em: new Date().toISOString() }).eq("id", id)
    .eq("usuario_id", user.id).eq("empresa_id", user.empresa_id)
    .is("consumido_em", null).gt("expira_em", new Date().toISOString())
    .select("caminho,nome,tamanho").maybeSingle();
  if (error || !ticket) throw new Error("Envio expirado, já utilizado ou pertencente a outro acesso.");
  const expectedPath = `${user.empresa_id}/${user.id}/${id}.pdf`;
  if (ticket.caminho !== expectedPath) throw new Error("Caminho do arquivo inválido.");
  const { data: blob, error: downloadError } = await supabase.storage.from(UPLOAD_BUCKET).download(expectedPath);
  if (downloadError || !blob || blob.size > MAX_PDF_BYTES) throw new Error("PDF indisponível. Envie o arquivo novamente.");
  const buffer = Buffer.from(await blob.arrayBuffer());
  validatePdfBytes(buffer, ticket.tamanho);
  const destination = uploadDirectory();
  const filename = `${randomUUID()}.pdf`;
  const filePath = path.join(destination, filename);
  await writeFile(filePath, buffer, { flag: "wx" });
  return { fieldname: field, originalname: ticket.nome, encoding: "7bit", mimetype: "application/pdf",
    size: buffer.length, destination, filename, path: filePath, buffer, stream: Readable.from(buffer) } satisfies Express.Multer.File;
}

export async function deleteTemporaryPdf(filePath: string) {
  await unlink(filePath).catch(() => {});
}

/** Signed upload tokens live two hours. Remove objects only after that window. */
export async function cleanupExpiredUploads() {
  const cutoff = new Date(Date.now() - 3 * 60 * 60_000).toISOString();
  const { data, error } = await supabase.from("uploads_contingencia")
    .select("id,caminho").lt("criado_em", cutoff).limit(50);
  if (error) throw error;
  if (!data?.length) return;
  const paths = data.filter(ticket => /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/i.test(ticket.caminho));
  if (paths.length !== data.length) throw new Error("Arquivo temporário fora do diretório permitido.");
  const removed = await supabase.storage.from(UPLOAD_BUCKET).remove(paths.map(ticket => ticket.caminho));
  if (removed.error) throw removed.error;
  const deleted = await supabase.from("uploads_contingencia").delete().in("id", paths.map(ticket => ticket.id));
  if (deleted.error) throw deleted.error;
}
