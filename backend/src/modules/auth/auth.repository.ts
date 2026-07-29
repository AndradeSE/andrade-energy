import { supabase } from "../../config/supabase";

export async function buscarUsuarioPorEmail(email: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) throw error;

  return data;
}