const MAX_PDF_BYTES = 10 * 1024 * 1024;
export function validatePreviewPdfUpload(ticket: { uploadId: string; uploadUrl: string }, size: number) {
  if (!Number.isInteger(size) || size <= 0 || size > MAX_PDF_BYTES) throw new Error("Envie um PDF de até 10 MB.");
  const url = new URL(ticket.uploadUrl);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket.uploadId) ||
    url.protocol !== "https:" || url.hostname !== "qqhcjieymypowunkixmk.supabase.co" || url.port || url.username || url.password ||
    !new RegExp(`^/storage/v1/object/upload/sign/contingency-uploads/[0-9a-f-]{36}/[0-9a-f-]{36}/${ticket.uploadId}\\.pdf$`, "i").test(url.pathname) ||
    !url.searchParams.get("token")) throw new Error("Não foi possível validar o destino do PDF.");
  return ticket;
}
