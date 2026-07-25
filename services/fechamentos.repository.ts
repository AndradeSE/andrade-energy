import { supabase } from "../supabase";

export async function obterResumoOperacao() {
  const { data, error } = await supabase
    .from("fechamentos")
    .select(`
      energia_gerada,
      energia_disponivel,
      receita_prevista
    `);

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

export async function listarFechamentos() {

  const { data, error } =
    await supabase
      .from("fechamentos")
      .select(`
        *,
        usinas(nome)
      `)
      .order("competencia", {
        ascending: false,
      });

  if (error) throw error;

  return data ?? [];
}

export async function buscarFechamento(
  id: string
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
      .single();

  if (error) throw error;

  return data;

}

export async function criarFechamento(
  fechamento: any
) {
 console.log("DADOS RECEBIDOS");

    console.log(fechamento);
  const { data, error } =
    await supabase
      .from("fechamentos")
      .insert(fechamento)
      .select()
      .single();
 console.log("DATA",data);

    console.log("ERROR",error);
  if (error) throw error;

  return data;
}