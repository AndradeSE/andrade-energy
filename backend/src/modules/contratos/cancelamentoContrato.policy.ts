const STATUS_CANCELAVEIS = new Set(["ATIVO", "VIGENTE"]);

export function contratoAceitaSolicitacaoCancelamento(status: unknown) {
  return STATUS_CANCELAVEIS.has(String(status ?? "").trim().toUpperCase());
}

export function processamentoCancelamentoExpirou(iniciadoEm: unknown, agora = Date.now(), limiteMs = 5 * 60 * 1000) {
  const inicio = new Date(String(iniciadoEm ?? "")).getTime();
  return !Number.isFinite(inicio) || agora - inicio >= limiteMs;
}
