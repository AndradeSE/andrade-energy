import { supabase } from "../config/supabase";
export const teste = 123;
export async function inserirHistorico(dados: {  fatura_id: string;
  competencia: string;
  consumo_kwh: number;
  media_diaria: number;
  dias: number;
}) {
  const { data, error } = await supabase
    .from("historico_consumo")
    .insert(dados)
    .select()
    .single();

  if (error) throw error;

  return data;
}