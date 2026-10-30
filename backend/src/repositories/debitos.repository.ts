import { supabase } from "../config/supabase";

export async function salvarDebitos(
  faturaId: string,
  debitos: {
    competencia: string;
    valor: number;
    previsaoCorte?: string;
  }[]
) {
  if (!debitos.length) return;

  const registros = debitos.map((item) => ({
    fatura_id: faturaId,
    competencia: item.competencia,
    valor: item.valor,
    previsao_corte: item.previsaoCorte ?? null,
  }));

  const { error } = await supabase
    .from("debitos_fatura")
    .insert(registros);

  if (error) {
    throw error;
  }
}