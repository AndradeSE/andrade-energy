export const hojeNoBrasil = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function validarConfirmacaoDesligamento(solicitacao: any, dados: any, hoje = hojeNoBrasil()) {
  if (!solicitacao.aceito_em) throw new Error("Aceite o pedido e inicie o desligamento antes de concluir o cancelamento.");
  if (dados?.confirmado !== true) throw new Error("Confirme que a retirada da UC do rateio/injeção foi efetivada pela distribuidora.");
  const data = String(dados?.data ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(`${data}T12:00:00Z`)) || new Date(`${data}T12:00:00Z`).toISOString().slice(0, 10) !== data || data > hoje) {
    throw new Error("Informe a data real de desligamento, sem data futura.");
  }
  const protocolo = String(dados?.protocolo ?? "").trim();
  if (protocolo.length < 3 || protocolo.length > 120) throw new Error("Informe o protocolo ou a referência da confirmação da distribuidora (3 a 120 caracteres).");
  return { desligamento_efetivo_em: data, protocolo_desligamento: protocolo };
}

export function fimAvisoPrevio(solicitadoEm: string) {
  const diaPedido = new Date(solicitadoEm).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const data = new Date(`${diaPedido}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + 90);
  return data.toISOString().slice(0, 10);
}
