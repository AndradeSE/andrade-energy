export const UPLOAD_BUCKET = "contingency-uploads";
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export class PdfUploadPreparationError extends Error {
  constructor(public readonly code: "UPLOAD_STORAGE_UNAVAILABLE" | "UPLOAD_TICKET_UNAVAILABLE" | "UPLOAD_SCOPE_INVALID") {
    super(code); this.name = "PdfUploadPreparationError";
  }
}
export function validatePdfMetadata(input: { nome?: unknown; tamanho?: unknown; tipo?: unknown }) {
  const extensoes: Record<string, RegExp> = { "application/pdf": /\.pdf$/i, "image/jpeg": /\.jpe?g$/i, "image/png": /\.png$/i };
  const formato = extensoes[String(input.tipo)];
  if (!Number.isSafeInteger(input.tamanho) || Number(input.tamanho) < 1 || Number(input.tamanho) > MAX_PDF_BYTES || !formato) {
    throw new Error("Envie um PDF, JPG ou PNG de até 10 MB.");
  }
  const nome = String(input.nome ?? "arquivo.pdf").replace(/\\/g, "/").split("/").pop()!.slice(0, 120);
  if (!formato.test(nome)) throw new Error("O nome do arquivo deve corresponder ao formato PDF, JPG ou PNG.");
  return { nome, tamanho: Number(input.tamanho) };
}
export function validatePdfBytes(buffer: Buffer, expected: number) {
  if (buffer.length !== expected || buffer.length > MAX_PDF_BYTES || !buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) {
    throw new Error("O arquivo recebido não corresponde ao PDF autorizado.");
  }
}
