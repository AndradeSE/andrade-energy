import { supabase } from "../../config/supabase";

export async function salvarRateios(
  rateios: any[]
) {

  const { data, error } = await supabase
    .from("rateios")
    .insert(rateios)
    .select();

  if (error) throw error;

  return data ?? [];

}