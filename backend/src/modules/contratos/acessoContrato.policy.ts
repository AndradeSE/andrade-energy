/** Autorização por UC: status administrativo sozinho não comprova assinatura. */
export function contratoLiberaUnidade(contrato: any, hoje = new Date().toISOString().slice(0, 10)): boolean {
  if (!contrato?.unidade_consumidora_id) return false;
  if (["CANCELADO", "VENCIDO"].includes(String(contrato.status).toUpperCase())) return false;
  if (contrato.vigencia_fim && String(contrato.vigencia_fim).slice(0, 10) < hoje) return false;
  const validacaoExterna = contrato.contrato_assinado_url && contrato.dados_documento?.assinatura_externa_validada_em;
  // Um PDF já marcado como VIGENTE foi conferido pelo gerador e libera a UC,
  // independentemente da data em que foi assinado. Uploads ainda aguardando
  // conferência permanecem ATIVO + assinatura_externa_pendente.
  const assinaturaVigente = contrato.contrato_assinado_url
    && String(contrato.status).toUpperCase() === "VIGENTE"
    && contrato.dados_documento?.assinatura_externa_pendente !== true;
  return Boolean(contrato.aceite_cliente_em || validacaoExterna || assinaturaVigente);
}

/** Evita restaurar um contrato apenas por pertencer ao mesmo cliente. */
export function contratoCorrespondeAoNumeroUc(contrato: any, numeroUc: unknown): boolean {
  const uc = String(numeroUc ?? "").replace(/\D/g, "");
  if (!uc) return false;
  const numeroContrato = String(contrato?.numero ?? "").replace(/\D/g, "");
  const numeroSnapshot = String(
    contrato?.dados_documento?.numero_uc
      ?? contrato?.dados_documento?.uc_numero
      ?? contrato?.dados_documento?.numero_instalacao
      ?? ""
  ).replace(/\D/g, "");
  return numeroSnapshot === uc || numeroContrato.includes(uc);
}

export function acessoPorUnidade(unidades: any[], contratos: any[]) {
  return unidades.map(uc => {
    const vinculados = contratos.filter(c => c.unidade_consumidora_id === uc.id && c.cliente_id === uc.cliente_id);
    const liberado = vinculados.some(c => contratoLiberaUnidade(c));
    return { ...uc, liberado, contratoId: vinculados[0]?.id ?? null,
      aguardandoValidacao: Boolean(vinculados[0]?.dados_documento?.assinatura_externa_pendente && !liberado) };
  });
}
