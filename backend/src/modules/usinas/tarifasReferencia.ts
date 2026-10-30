// As duas tarifas devem pertencer à mesma fatura. Tarifa cheia com impostos
// não substitui SCEE: essa troca inflaria artificialmente o custo do Fio B.
export function montarHistoricoTarifasGd2(faturas: Record<string, any>[]) {
  const meses = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  function referencia(valor: unknown) {
    const texto = String(valor ?? "").trim().toUpperCase();
    const iso = /^(\d{4})-(\d{2})/.exec(texto);
    if (iso) return `${iso[1]}-${iso[2]}`;
    const br = /^(\d{1,2}|[A-Z]{3})\/(\d{2}|\d{4})$/.exec(texto);
    if (!br) return null;
    const mes = meses.includes(br[1]) ? meses.indexOf(br[1]) + 1 : Number(br[1]);
    if (mes < 1 || mes > 12) return null;
    return `${br[2].length === 2 ? '20' + br[2] : br[2]}-${String(mes).padStart(2, '0')}`;
  }
  return faturas.map((item) => ({
    referencia: referencia(item.referencia ?? item.competencia),
    tarifa_scee: Number(item.tarifaScee ?? item.tarifa_scee ?? 0),
    tarifa_gd2: Number(item.tarifaGD2 ?? item.tarifaGD ?? item.tarifa_gd ?? 0),
  })).filter((item) => item.referencia && Number.isFinite(item.tarifa_scee) && Number.isFinite(item.tarifa_gd2)
    && item.tarifa_gd2 > 0 && item.tarifa_scee >= item.tarifa_gd2)
    .sort((a, b) => String(b.referencia).localeCompare(String(a.referencia)));
}
