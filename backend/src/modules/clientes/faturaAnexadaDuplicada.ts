export function chaveFaturaAnexada(dados: Record<string, any> = {}) {
  const uc = String(dados.uc ?? dados.numero_instalacao ?? '').replace(/\D/g, '');
  const referencia = String(dados.referencia ?? '').trim().toUpperCase();
  const vencimento = String(dados.vencimento ?? '').trim();
  const total = Number(dados.valorTotal ?? dados.valor_total);
  const consumo = Number(dados.consumo);
  if (!uc || !referencia || !vencimento || !Number.isFinite(total) || !Number.isFinite(consumo)) return null;
  return JSON.stringify([uc, referencia, vencimento, Math.round(total * 100), consumo]);
}
export function faturasAnexadasUnicas<T extends { caminho_pdf?: string; dados_fatura?: Record<string, any> }>(anexos: T[]) {
  const vistos = new Set<string>();
  return anexos.filter(anexo => {
    const chave = chaveFaturaAnexada(anexo.dados_fatura) ?? (anexo.caminho_pdf ? `arquivo:${anexo.caminho_pdf}` : null);
    if (!chave) return true;
    if (vistos.has(chave)) return false;
    vistos.add(chave); return true;
  });
}
