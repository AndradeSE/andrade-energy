import { supabase } from "../../config/supabase";

export async function obterResumoOperacao(empresaId: string) {

  const { data, error } =
    await supabase
      .from("fechamentos")
      .select(`
        energia_gerada,
        energia_disponivel,
        receita_prevista
      `)
      .eq("empresa_id", empresaId);

  if (error) throw error;

  const lista = data ?? [];

  return {

    fechamentos: lista.length,

    energiaGerada: lista.reduce(
      (a, b) => a + Number(b.energia_gerada || 0),
      0
    ),

    energiaDisponivel: lista.reduce(
      (a, b) => a + Number(b.energia_disponivel || 0),
      0
    ),

    receitaPrevista: lista.reduce(
      (a, b) => a + Number(b.receita_prevista || 0),
      0
    ),

  };

}

export async function listarFechamentos(empresaId: string) {

  const { data, error } =
    await supabase
      .from("fechamentos")
      .select(`
        *,
        usinas(nome)
      `)
      .eq("empresa_id", empresaId)
      .order("competencia", {
        ascending: false,
      });

  if (error) throw error;

  return data ?? [];
}

export async function buscarFechamento(
  id: string,
  empresaId: string
) {

  const { data, error } =
    await supabase
      .from("fechamentos")
      .select(`
        *,
        usinas(*),
        rateios(
          *,
          clientes(nome,uc)
        )
      `)
      .eq("id", id)
      .eq("empresa_id", empresaId)
      .single();

  if (error) throw error;

  return data;

}

export async function criarFechamento(
  fechamento: any,
  empresaId: string
) {

  const { data, error } =
    await supabase
      .from("fechamentos")
      .insert({ ...fechamento, empresa_id: empresaId })
      .select()
      .single();

  if (error) throw error;

  return data;

}
