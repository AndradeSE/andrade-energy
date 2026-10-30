/** Mantém as condições aceitas para faturamento enquanto uma revisão aguarda aceite. */
export function configuracaoVigenteParaFaturamento(unidade: any, contratoPendente: any) {
  if (!contratoPendente) return unidade;
  const anterior = contratoPendente.configuracao_uc_snapshot
    ?? contratoPendente.dados_documento?.configuracao_uc;
  if (!anterior) {
    throw new Error("Não foi possível recuperar as condições do contrato anterior. Confira a revisão antes de faturar esta UC.");
  }
  return {
    ...unidade,
    usina_id: anterior.usina_id ?? unidade.usina_id,
    modalidade_faturamento: anterior.modalidade_faturamento ?? unidade.modalidade_faturamento,
    desconto_percentual: anterior.desconto_percentual ?? contratoPendente.desconto ?? unidade.desconto_percentual,
    percentual_rateio: anterior.percentual_rateio ?? unidade.percentual_rateio,
    fatura_somente_andrade: anterior.fatura_somente_andrade ?? unidade.fatura_somente_andrade,
    repassar_disponibilidade_gd1: anterior.repassar_disponibilidade_gd1 ?? unidade.repassar_disponibilidade_gd1,
    repassar_disponibilidade_gd2: anterior.repassar_disponibilidade_gd2 ?? unidade.repassar_disponibilidade_gd2,
    repassar_diferenca_fio_b_gd2: anterior.repassar_diferenca_fio_b_gd2 ?? unidade.repassar_diferenca_fio_b_gd2,
    percentual_repasse_disponibilidade: anterior.percentual_repasse_disponibilidade
      ?? (anterior.repassar_disponibilidade_gd2 === false ? 0 : 100),
  };
}
