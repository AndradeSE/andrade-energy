export const UPLOAD_BUCKET = "contingency-uploads";
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export class PdfUploadPreparationError extends Error {
  constructor(public readonly code: "UPLOAD_STORAGE_UNAVAILABLE" | "UPLOAD_TICKET_UNAVAILABLE" | "UPLOAD_SCOPE_INVALID") {
    super(code); this.name = "PdfUploadPreparationError";
  }
}
export function validatePdfMetadata(input: { nome?: unknown; tamanho?: unknown; tipo?: unknown }) {
  if (!Number.isSafeInteger(input.tamanho) || Number(input.tamanho) < 1 || Number(input.tamanho) > MAX_PDF_BYTES || input.tipo !== "application/pdf") {
    throw new Error("Envie um PDF de até 10 MB.");
  }
  const nome = String(input.nome ?? "arquivo.pdf").replace(/\\/g, "/").split("/").pop()!.slice(0, 120);
  if (!nome.toLowerCase().endsWith(".pdf")) throw new Error("Envie um arquivo PDF.");
  return { nome, tamanho: Number(input.tamanho) };
}
export function validatePdfBytes(buffer: Buffer, expected: number) {
  if (buffer.length !== expected || buffer.length > MAX_PDF_BYTES || !buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) {
    throw new Error("O arquivo recebido não corresponde ao PDF autorizado.");
  }
}
