export type TipoGdDocumento = "GD1" | "GD2" | "MISTA" | null;

function normalizar(valor: unknown): TipoGdDocumento {
  const tipo = String(valor ?? "").toUpperCase().replace(/[\s_-]/g, "");
  if (tipo === "GD1" || tipo === "GDI") return "GD1";
  if (tipo === "GD2" || tipo === "GDII") return "GD2";
  if (["MISTA", "GD1+GD2", "GDI+GDII"].includes(tipo)) return "MISTA";
  return null;
}

/** Identificação do documento; não participa do cálculo dos valores faturados. */
export function identificarTipoGdDocumento(fatura: any): TipoGdDocumento {
  const registrado = normalizar(fatura.tipo_gd) ?? normalizar(fatura.tipo_gd_documento);
  if (registrado) return registrado;
  const gd1 = Number(fatura.energia_compensada_gd1 ?? 0) > 0;
  const gd2 = Number(fatura.energia_compensada_gd2 ?? 0) > 0;
  if (gd1 || gd2) return gd1 && gd2 ? "MISTA" : gd2 ? "GD2" : "GD1";
  const unidade = fatura.unidades_consumidoras ?? {};
  const usina = Array.isArray(unidade.usinas) ? unidade.usinas[0] : unidade.usinas;
  return normalizar(usina?.tipo_gd) ?? normalizar(unidade.tipo_gd) ?? null;
}

export function rotuloTipoGdDocumento(tipo: TipoGdDocumento) {
  return tipo === "GD1" ? "GD I" : tipo === "GD2" ? "GD II" : tipo === "MISTA" ? "GD I + GD II" : "GD não informado";
}
