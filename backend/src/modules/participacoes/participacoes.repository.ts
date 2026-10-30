import { supabase } from "../../config/supabase";

export async function criarParticipacao(
  usinaId: string,
  clienteId: string,
  percentual: number
) {
  const { data, error } = await supabase
    .from("participacoes_usina")
    .insert({
      usina_id: usinaId,
      cliente_id: clienteId,
      percentual,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function listarParticipacoes(
  usinaId: string
) {
  const { data, error } = await supabase
    .from("participacoes_usina")
    .select(`
      *,
      clientes(
        id,
        nome,
        uc
      )
    `)
    .eq("usina_id", usinaId);

  if (error) throw error;

  return data ?? [];
}