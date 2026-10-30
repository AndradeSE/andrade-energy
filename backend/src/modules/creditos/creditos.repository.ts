import { supabase } from "../../config/supabase";

export async function listarCreditos(clienteId: string) {
  const { data, error } = await supabase
    .from("creditos_cliente")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("competencia", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

export async function salvarCredito(credito: any) {
  const { data, error } = await supabase
    .from("creditos_cliente")
    .insert(credito)
    .select()
    .single();

  if (error) throw error;

  return data;
}