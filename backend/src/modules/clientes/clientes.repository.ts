console.log("CLIENTES REPOSITORY CARREGADO");
import { supabase } from "../../config/supabase";

export async function listarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome");

  if (error) throw error;

  return data ?? [];
}

export async function buscarCliente(id: string) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function buscarClientePorUC(uc: string) {
  const ucNormalizada = String(uc).replace(/\D/g, "");

  const { data, error } = await supabase
    .from("clientes")
    .select("*");

  if (error) throw error;

  for (const cliente of data ?? []) {
    const ucBanco = String(cliente.uc ?? "").replace(/\D/g, "");

    if (ucBanco === ucNormalizada) {
      return cliente;
    }
  }

  return null;
}

export async function criarCliente(cliente: any) {
  const { data, error } = await supabase
    .from("clientes")
    .insert(cliente)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function atualizarCliente(
  id: string,
  cliente: any
) {
  const { data, error } = await supabase
    .from("clientes")
    .update(cliente)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function excluirCliente(id: string) {
  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}