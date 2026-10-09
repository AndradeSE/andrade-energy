type EstadoRegraOutlook = {
  status?: string;
  regra_status?: string;
  regra_erro?: string | null;
};

export function erroRegraAutomaticaOutlook(conexao: EstadoRegraOutlook): string | null {
  if (conexao.status === "REGRA_ATIVA" && conexao.regra_status === "ATIVA" && !conexao.regra_erro) return null;
  return conexao.regra_erro || "O Outlook foi conectado, mas a regra de faturamento automático não está ativa. Conecte novamente para concluir a configuração.";
}
