import { supabase } from "../config/supabase";

export async function buscarClientePorUC(uc: string) {

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("uc", uc)
    .maybeSingle();

  if (error) throw error;

  return data;

}

export async function criarCliente(dados: {
  nome: string;
  uc: string;
  distribuidora: string;
}) {

  const { data, error } = await supabase
    .from("clientes")
    .insert({
      nome: dados.nome,
      uc: dados.uc,
      distribuidora: dados.distribuidora
    })
    .select()
    .single();

  if (error) throw error;

  return data;

}