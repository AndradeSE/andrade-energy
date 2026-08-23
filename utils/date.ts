export function formatarDataBrasileira(valor: unknown, fallback = "Não informado") {
  const texto = String(valor ?? "").trim();
  if (!texto) return fallback;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(texto);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : texto;
}
