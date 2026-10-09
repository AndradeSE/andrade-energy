function titularidade(unidade: any) {
  const usina = Array.isArray(unidade.usinas) ? unidade.usinas[0] : unidade.usinas;
  return String(usina?.titularidade_ucs_recebedoras ?? "GERADOR").toUpperCase();
}

/** A conta autorizada não amplia o escopo de UCs de seu titular. */
export function unidadesNoEscopoRecebimento(origem: any, unidades: any[]) {
  if (origem.tipo === "GERADORA") return [origem];
  const escopo = titularidade(origem);
  return unidades.filter(unidade => unidade.empresa_id === origem.empresa_id
    && titularidade(unidade) === escopo
    && (escopo !== "CLIENTE" || unidade.cliente_id === origem.cliente_id));
}
