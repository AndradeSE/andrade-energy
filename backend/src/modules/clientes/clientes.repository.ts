import { supabase } from "../../config/supabase";

export async function listarFaturas() {
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .order("referencia", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function buscarFatura(
  numeroInstalacao: string,
  referencia: string
) {
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .eq("numero_instalacao", numeroInstalacao)
    .eq("referencia", referencia)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function inserirFatura(fatura: any) {
  const { data, error } = await supabase
    .from("faturas")
    .insert(fatura)
    .select()
    .single();

  if (error) throw error;

  return data;
}