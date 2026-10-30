/** Uma cobrança recebida exige conciliação/estorno, nunca simples exclusão. */
export function cobrancaAsaasPodeSerExcluida(status: unknown): boolean {
  return ["PENDING", "OVERDUE"].includes(String(status ?? "").toUpperCase());
}
