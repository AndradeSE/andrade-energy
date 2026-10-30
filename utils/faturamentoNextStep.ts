type Fatura = { status?: string | null };

export function mostrarProximoPassoFaturamento(
  contratoAssinado: boolean,
  recebimentoAtivo: boolean | null,
  faturas: Fatura[],
) {
  // Falha/consulta pendente não significa ausência de configuração.
  if (!contratoAssinado || recebimentoAtivo !== false) return false;
  return !faturas.some((fatura) =>
    !["RASCUNHO", "CANCELADA", "CANCELADO"].includes(String(fatura.status ?? "").toUpperCase()),
  );
}
