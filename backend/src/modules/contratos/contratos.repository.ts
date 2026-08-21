import { supabase } from "../../config/supabase";

export async function buscarContratoCliente(
  clienteId: string,
  somenteLegado = false
) {
  let query = supabase
    .from("contratos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (somenteLegado) query = query.is("unidade_consumidora_id", null);

  const { data, error } = await query.maybeSingle();

  if (error) throw error;

  return data;
}

export async function buscarContratoAtualUnidade(
  unidadeId: string
) {
  const { data, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("unidade_consumidora_id", unidadeId)
    .in("status", ["ATIVO", "VIGENTE"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function buscarContratoMaisRecenteUnidade(
  unidadeId: string
) {
  const atual = await buscarContratoAtualUnidade(unidadeId);
  if (atual) return atual;

  const { data, error } = await supabase
    .from("contratos")
    .select("*")
    .eq("unidade_consumidora_id", unidadeId)
    .order("vigencia_fim", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function salvarContratoUnidade(
  unidadeId: string,
  contrato: any
) {
  const existente = await buscarContratoAtualUnidade(unidadeId);

  if (existente?.id) {
    const hoje = new Date().toISOString().slice(0, 10);
    const vigenciaExpirada = Boolean(
      existente.vigencia_fim && String(existente.vigencia_fim).slice(0, 10) < hoje
    );
    const novoAtivo = ["ATIVO", "VIGENTE"].includes(String(contrato.status ?? "").toUpperCase());

    // Renovação: preserva o contrato que venceu e libera a vigência nova.
    if (vigenciaExpirada && novoAtivo) {
      await atualizarContrato(existente.id, { status: "VENCIDO" });
      return await criarContrato(contrato);
    }

    return await atualizarContrato(existente.id, contrato);
  }

  return await criarContrato(contrato);
}

export async function criarContrato(
  contrato: any
) {
  const { data, error } = await supabase
    .from("contratos")
    .insert(contrato)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function atualizarContrato(
  id: string,
  contrato: any
) {
  const { data, error } = await supabase
    .from("contratos")
    .update(contrato)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function excluirContrato(
  id: string
) {
  const { error } = await supabase
    .from("contratos")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
