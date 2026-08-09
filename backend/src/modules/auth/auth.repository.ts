import { supabase } from "../../config/supabase";

export async function login(email: string, senha: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("email", email)
    .eq("senha", senha)
    .eq("ativo", true)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function buscarUsuario(id: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listarUsuarios() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("nome");

  if (error) {
    throw error;
  }

  return data ?? [];
}