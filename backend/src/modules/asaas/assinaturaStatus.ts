export type StatusAssinaturaComercial = "ATIVA" | "INADIMPLENTE" | "SUSPENSA";

export function statusAssinaturaPorEvento(evento: string): StatusAssinaturaComercial | null {
  if (["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(evento)) return "ATIVA";
  if (evento === "PAYMENT_OVERDUE") return "INADIMPLENTE";
  if (["PAYMENT_DELETED", "PAYMENT_REFUNDED", "PAYMENT_REFUND_IN_PROGRESS"].includes(evento)) return "SUSPENSA";
  return null;
}
