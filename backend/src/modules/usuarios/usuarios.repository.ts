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

export async function removerContaGeradora(id: string) {
  const { error } = await supabase.rpc("remover_conta_geradora", {
    p_gerador_id: id,
  });
  if (error) {
    // Compatibilidade com ambientes cujo schema ainda não recebeu a RPC.
    // Mantém o histórico financeiro e contratual, encerrando apenas o acesso.
    const { data: assinaturas, error: assinaturasError } = await supabase
      .from("assinaturas_geradores")
      .select("id")
      .eq("gerador_id", id);
    if (assinaturasError) throw assinaturasError;
    const assinaturaIds = (assinaturas ?? []).map((item: any) => item.id);
    const agora = new Date().toISOString();
    if (assinaturaIds.length) {
      const { error: cobrancasError } = await supabase
        .from("cobrancas_assinaturas_geradores")
        .update({ status: "CANCELADA", atualizado_em: agora })
        .in("assinatura_id", assinaturaIds)
        .in("status", ["PENDENTE", "VENCIDA"]);
      if (cobrancasError) throw cobrancasError;
    }
    const { error: cancelarError } = await supabase
      .from("assinaturas_geradores")
      .update({ status: "CANCELADA", cancelada_em: agora, atualizado_em: agora })
      .eq("gerador_id", id)
      .neq("status", "CANCELADA");
    if (cancelarError) throw cancelarError;
    const { error: sessoesError } = await supabase
      .from("sessoes_usuarios")
      .update({ revogada_em: agora })
      .eq("usuario_id", id)
      .is("revogada_em", null);
    if (sessoesError) throw sessoesError;
    const { data: removido, error: usuarioError } = await supabase
      .from("usuarios")
      .update({ ativo: false })
      .eq("id", id)
      .eq("perfil", "GESTOR")
      .select("id")
      .maybeSingle();
    if (usuarioError) throw usuarioError;
    if (!removido) throw new Error("Conta geradora não encontrada.");
  }
  return { removido: true, id };
}
