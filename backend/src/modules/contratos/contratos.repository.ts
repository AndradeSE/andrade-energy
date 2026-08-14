import { supabase } from "../../config/supabase";

export async function buscarContratoCliente(
  clienteId: string
) {
  const { data, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("cliente_id", clienteId)
    .single();

  console.log("ERRO:", error);
  console.log("DADOS:", data);

  if (error) throw error;

  return data;
}

export async function criarContrato(
  contrato: any
) {
  const { data, error } = await supabase
    .from("contratos")
    .insert(contrato)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function atualizarContrato(
  id: string,
  contrato: any
) {
  const { data, error } = await supabase
    .from("contratos")
    .update(contrato)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function excluirContrato(
  id: string
) {
  const { error } = await supabase
    .from("contratos")
    .delete()
    .eq("id", id);

  if (error) throw error;
}