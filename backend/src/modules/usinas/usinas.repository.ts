import { supabase } from "../../config/supabase";

export async function listarUsinas() {
  const { data, error } = await supabase
    .from("usinas")
    .select("*")
    .order("nome");

  if (error) throw error;

  return data ?? [];
}

export async function buscarUsina(
  id: string
) {
  const { data, error } = await supabase
    .from("usinas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function criarUsina(
  usina: any
) {
  const { data, error } = await supabase
    .from("usinas")
    .insert(usina)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function editarUsina(
  id: string,
  usina: any
) {
  const { data, error } = await supabase
    .from("usinas")
    .update(usina)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function excluirUsina(
  id: string
) {
  const { error } = await supabase
    .from("usinas")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function buscarDashboardUsina(
  usinaId: string
) {
  const { data, error } = await supabase
    .from("fechamentos")
    .select(`
      id,
      competencia,
      energia_gerada,
      energia_alocada,
      energia_disponivel,
      receita_prevista,
      receita_realizada,
      ocupacao,
      status,
      created_at
    `)
    .eq("usina_id", usinaId)
    .order("competencia", { ascending: false });

  if (error) throw error;

  const lista = data ?? [];
  return {
    ultimo: lista[0] ?? null,
    energiaTotal: lista.reduce((total, fechamento) => total + Number(fechamento.energia_gerada ?? 0), 0),
  };
}
