export type PlanoContrato = "COM_FIDELIDADE" | "SEM_FIDELIDADE";

/** Cadastros antigos conservam o plano e as cláusulas que já possuíam. */
export function normalizarPlanoContrato(valor: unknown): PlanoContrato {
  if (valor === undefined || valor === null) return "COM_FIDELIDADE";
  if (valor === "COM_FIDELIDADE" || valor === "SEM_FIDELIDADE") return valor;
  throw new Error("Escolha um plano com fidelidade ou sem fidelidade.");
}

export function descontoInicialSemFidelidade(tipoGd: unknown): number | null {
  const gd = String(tipoGd ?? "").toUpperCase();
  return gd === "GD2" ? 30 : gd === "GD1" ? 20 : null;
}

export const AVISO_PREVIO_SEM_FIDELIDADE_DIAS = 90;
