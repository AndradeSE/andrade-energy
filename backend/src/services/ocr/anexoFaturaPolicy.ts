type Anexo = { filename?: string; content_type?: string; content_disposition?: string; content_id?: string };
export function anexoPdf(anexo: Anexo) {
  return anexo.content_type === 'application/pdf' || /\.pdf$/i.test(anexo.filename ?? '');
}
export function anexoImagemFatura(anexo: Anexo) {
  return !/^inline\b/i.test(anexo.content_disposition ?? '') && (!anexo.content_id || /^attachment\b/i.test(anexo.content_disposition ?? ''))
    && /\.(?:jpe?g|png)$/i.test(anexo.filename ?? '')
    && ['image/jpeg','image/png','application/octet-stream',undefined].includes(anexo.content_type);
}
export function escolherAnexoFatura<T extends Anexo>(anexos: T[]) {
  return anexos.find(anexoPdf) ?? anexos.find(anexoImagemFatura);
}
