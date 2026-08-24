import { supabase } from "../../config/supabase";

const camposPublicos = "id,nome,cpf,email,telefone,perfil,ativo,usina_id,created_at";

export async function listarContasGeradoras() {
  const { data, error } = await supabase.from("usuarios").select(camposPublicos).in("perfil", ["ADMIN", "GESTOR"]).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function buscarGerador(id: string) {
  const { data, error } = await supabase.from("usuarios").select(camposPublicos).eq("id", id).in("perfil", ["ADMIN", "GESTOR"]).maybeSingle();
  if (error) throw error;
  return data;
}

export async function atualizarStatusGerador(id: string, ativo: boolean) {
  const { data, error } = await supabase.from("usuarios").update({ ativo }).eq("id", id).eq("perfil", "GESTOR").select(camposPublicos).single();
  if (error) throw error;
  if (!ativo) await supabase.from("sessoes_usuarios").update({ revogada_em: new Date().toISOString() }).eq("usuario_id", id).is("revogada_em", null);
  return data;
}
