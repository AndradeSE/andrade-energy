import { inserirHistorico } from "../repositories/historico.repository";

export async function salvarHistorico(
  faturaId: string,
  historico: {
    mes: string;
    consumo: number;
    mediaDiaria: number;
    dias: number;
  }[]
) {
  if (!historico.length) return;

  for (const item of historico) {
    await inserirHistorico({
      fatura_id: faturaId,
      competencia: item.mes,
      consumo_kwh: item.consumo,
      media_diaria: item.mediaDiaria,
      dias: item.dias,
    });
  }
}