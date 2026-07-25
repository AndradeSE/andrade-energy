import { supabase } from "../config/supabase";
console.log("Repository de faturas carregado");
 
export async function buscarFatura(
  clienteId: string,
  referencia: string
) {
    console.log("buscarFatura chamada");
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("referencia", referencia)
    .maybeSingle();

  if (error) throw error;

  return data;
}
export async function salvarFaturaBanco(
  dados: any
) {

  const { data, error } = await supabase
    .from("faturas")
    .insert(dados)
    .select()
    .single();

  if (error) throw error;

  return data;

}