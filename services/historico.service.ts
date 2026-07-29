import { inserirHistorico } from "../repositories/historico.repository";

export async function salvarHistorico(fatura: {
  id: string;
  referencia: string;
  consumo_kwh: string | number;
}) {
  const consumo = Number(fatura.consumo_kwh);

  const dias = 30;

  const media = consumo / dias;

  return inserirHistorico({
    fatura_id: fatura.id,
    competencia: fatura.referencia,
    consumo_kwh: consumo,
    media_diaria: Number(media.toFixed(2)),
    dias,
  });
}