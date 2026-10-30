import { supabase } from "../config/supabase";
export async function buscarFatura(
  clienteId: string,
  referencia: string
) {
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("referencia", referencia)
    .maybeSingle();

  if (error) throw error;

  return data;
}
export async function salvarFaturaBanco(dados: any) {
  const { data, error } = await supabase
    .from("faturas")
    .insert(dados)
    .select()
    .single();

  if (error) throw error;

  return data;
}
export async function buscarFaturaPorId(id: string) {

  const { data, error } = await supabase
    .from("faturas")
    .select(`
      *,
      clientes(
        nome,
        uc
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;

}
export async function listarFaturasPorCliente(
  clienteId: string
) {
  const { data, error } = await supabase
    .from("faturas")
    .select(`
      id,
      referencia,
      valor_final,
      vencimento,
      arquivo_url
    `)
    .eq("cliente_id", clienteId)
    .order("vencimento", { ascending: false });

  if (error) throw error;

  return data;
}
