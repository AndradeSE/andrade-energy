type Unidade = { id?: string; status?: string; tipo?: string; usina_id?: string; recebimento_email_ativo?: boolean; usinas?: any };

/** A configuração geral usa uma UC ativa da usina aberta, nunca a mais recente pendente. */
export function unidadesParaRecebimento<T extends Unidade>(unidades: T[], usinaId?: string | null): T[] {
  return unidades.filter(item => {
    const usina = Array.isArray(item.usinas) ? item.usinas[0] : item.usinas;
    return item.status === 'ATIVA'
      && String(item.tipo ?? 'BENEFICIARIA').toUpperCase() !== 'GERADORA'
      && String(usina?.titularidade_ucs_recebedoras ?? 'GERADOR') === 'GERADOR'
      && (!usinaId || String(item.usina_id ?? usina?.id ?? '') === usinaId);
  }).sort((a, b) => Number(Boolean(b.recebimento_email_ativo)) - Number(Boolean(a.recebimento_email_ativo)));
}
