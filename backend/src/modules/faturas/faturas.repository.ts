import { supabase } from "../../config/supabase";

type ListarFaturasFiltro = {
  clienteId?: string;
  uc?: string;
};

export async function listarFaturas(
  filtro?: ListarFaturasFiltro
) {
  let query = supabase
    .from("faturas")
    .select("*")
    .order("referencia", {
      ascending: false,
    });

  if (filtro?.clienteId) {
    query = query.eq(
      "cliente_id",
      filtro.clienteId
    );
  }

  if (filtro?.uc) {
    query = query.eq(
      "numero_instalacao",
      filtro.uc
    );
  }

  const { data, error } = await query;

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
    .eq(
      "numero_instalacao",
      numeroInstalacao
    )
    .eq("referencia", referencia)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function inserirFatura(
  fatura: any
) {
  const { data, error } = await supabase
    .from("faturas")
    .insert(fatura)
    .select()
    .single();

  if (error) throw error;

  return data;
}