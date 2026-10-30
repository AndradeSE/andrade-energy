// URLs legadas só identificam objetos no próprio Storage. Nunca buscar URLs
// gravadas no banco por fetch: isso permitiria alcançar serviços internos.
export function caminhoDocumentoPrivado(origem: string, bucket: string, supabaseUrl: string): string {
  if (!/^https?:\/\//i.test(origem)) return origem;
  const url = new URL(origem);
  if (url.protocol !== 'https:' || url.origin !== new URL(supabaseUrl).origin) throw new Error('Origem do documento não autorizada.');
  const partes = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
  if (!partes || partes[1] !== bucket) throw new Error('Bucket do documento não autorizado.');
  const caminho = decodeURIComponent(partes[2]);
  if (caminho.startsWith('/') || caminho.split('/').some(parte => parte === '..' || parte === '.')) throw new Error('Caminho do documento inválido.');
  return caminho;
}
