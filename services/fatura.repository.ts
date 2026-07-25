import { supabase } from "../supabase";

export async function inserirFatura(fatura: any) {

  const { data, error } =
    await supabase
      .from("faturas")
      .insert(fatura)
      .select()
      .single();
console.log("DATA", data);
console.log("ERROR", error);
  if (error)
    throw error;

  return data;

}