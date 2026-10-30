const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

export function ordemCompetencia(valor: unknown): number {
  const referencia = String(valor ?? "").trim().toUpperCase();
  const iso = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(referencia);
  if (iso) {
    const mes = Number(iso[2]);
    return mes >= 1 && mes <= 12 ? Number(iso[1]) * 100 + mes : 0;
  }
  const br = /^([A-Z]{3}|\d{1,2})\/(\d{4})$/.exec(referencia);
  if (!br) return 0;
  const mes = /^\d+$/.test(br[1]) ? Number(br[1]) : meses.indexOf(br[1]) + 1;
  return mes >= 1 && mes <= 12 ? Number(br[2]) * 100 + mes : 0;
}

export function chaveCompetencia(valor: unknown): string {
  const ordem = ordemCompetencia(valor);
  if (!ordem) return String(valor ?? "").trim();
  return `${Math.floor(ordem / 100)}-${String(ordem % 100).padStart(2, "0")}`;
}
