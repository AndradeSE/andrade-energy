import { supabase } from "../../config/supabase";

export async function buscarSaldoAtual(
  clienteId: string
) {
  const { data, error } = await supabase
    .from("creditos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("competencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function registrarConsumo(
  consumo: any
) {
  const { data, error } = await supabase
    .from("creditos")
    .insert(consumo)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function registrarSaldoDaFatura(credito: any) {
  const { data, error } = await supabase
    .from("creditos")
    .insert(credito)
    .select()
    .single();

  if (error) throw error;

  return data;
}
