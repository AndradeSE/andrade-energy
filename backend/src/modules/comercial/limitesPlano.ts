export type RecursoLimitado = "usinas" | "clientes";

export function validarLimitePlano(atual: number, limite: number | null | undefined, recurso: RecursoLimitado) {
  if (limite == null) return;
  if (atual < limite) return;
  const nome = recurso === "usinas" ? "usinas" : "clientes";
  throw new Error(`Seu plano permite até ${limite} ${nome}. Faça upgrade para continuar.`);
}
