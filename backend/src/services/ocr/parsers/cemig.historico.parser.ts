import { HistoricoConsumo } from "../../../types/FaturaExtraida";

export function extrairHistoricoConsumo(texto: string): HistoricoConsumo[] {
  const encontrados = texto.matchAll(/\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\/(\d{2})\s+(\d{1,6})(?:\s+([\d,.]+)\s+(\d{1,2}))?/gi);
  const meses = new Map<string, HistoricoConsumo>();

  for (const item of encontrados) {
    const mes = `${item[1].toUpperCase()}/${item[2]}`;
    if (meses.has(mes)) continue;
    const consumo = Number(item[3]);
    if (!Number.isFinite(consumo) || consumo < 0) continue;
    const dias = Number(item[5] ?? 0);
    const mediaExtraida = Number(String(item[4] ?? "0").replace(".", "").replace(",", "."));
    meses.set(mes, {
      mes,
      consumo,
      dias,
      mediaDiaria: mediaExtraida > 0 ? mediaExtraida : dias > 0 ? consumo / dias : 0,
    });
    if (meses.size === 12) break;
  }

  return Array.from(meses.values());
}
