import { supabase } from "../../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../../config/empresa";

function dadosPersistiveisDaUsina(usina: any) {
  const {
    cpf_titular: _cpfTitularSnake,
    cpfTitular: _cpfTitularCamel,
    ...dadosDaUsina
  } = usina ?? {};

  return dadosDaUsina;
}

export async function listarUsinas(empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("usinas")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");

  if (error) throw error;

  return data ?? [];
}

export async function buscarUsina(
  id: string,
  empresaId = EMPRESA_ANDRADE_ID,
) {
  const { data, error } = await supabase
    .from("usinas")
    .select("*")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .single();

  if (error) throw error;

  return data;
}

export async function criarUsina(
  usina: any,
  empresaId = EMPRESA_ANDRADE_ID,
) {
  const dadosDaUsina = dadosPersistiveisDaUsina(usina);
  const { data, error } = await supabase
    .from("usinas")
    .insert({ ...dadosDaUsina, empresa_id: empresaId })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function editarUsina(
  id: string,
  usina: any,
  empresaId = EMPRESA_ANDRADE_ID,
) {
  const dadosDaUsina = dadosPersistiveisDaUsina(usina);
  const { data, error } = await supabase
    .from("usinas")
    .update(dadosDaUsina)
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function excluirUsina(
  id: string,
  empresaId = EMPRESA_ANDRADE_ID,
) {
  const { data: faturas } = await supabase.from("faturas").select("id").eq("usina_id", id).eq("empresa_id", empresaId);
  const faturaIds = (faturas ?? []).map((fatura) => fatura.id);
  if (faturaIds.length) {
    await supabase.from("cobrancas").delete().in("fatura_id", faturaIds);
    await supabase.from("notificacoes_fatura").delete().in("fatura_id", faturaIds);
  }

  for (const tabela of ["creditos", "rateios", "participacoes_usina", "contratos", "fechamentos", "faturas", "unidades_consumidoras"]) {
    const { error: dependenciaError } = await supabase.from(tabela).delete().eq("usina_id", id).eq("empresa_id", empresaId);
    if (dependenciaError && dependenciaError.code !== "42P01") throw dependenciaError;
  }

  await supabase.from("clientes").update({ usina_id: null }).eq("usina_id", id);
  await supabase.from("convites_clientes").update({ usina_id: null }).eq("usina_id", id);
  await supabase.from("usuarios").update({ usina_id: null }).eq("usina_id", id);

  const { error } = await supabase
    .from("usinas")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  if (error) throw error;
}

export async function buscarDashboardUsina(
  usinaId: string,
  empresaId = EMPRESA_ANDRADE_ID,
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
    .eq("empresa_id", empresaId)
    .order("competencia", { ascending: false });

  if (error) throw error;

  const lista = data ?? [];
  return {
    ultimo: lista[0] ?? null,
    energiaTotal: lista.reduce((total, fechamento) => total + Number(fechamento.energia_gerada ?? 0), 0),
  };
}
