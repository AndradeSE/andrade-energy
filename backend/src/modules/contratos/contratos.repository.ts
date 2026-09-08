import { supabase } from "../../config/supabase";
import { contratoCorrespondeAoNumeroUc } from "./acessoContrato.policy";

export async function restaurarContratoAssinadoDaMesmaUc(
  clienteId: string,
  unidadeId: string,
  numeroUc: string,
  empresaId: string,
) {
  const { data: orfaos, error } = await supabase
    .from("contratos")
    .select("id,numero,status,aceite_cliente_em,contrato_assinado_url,dados_documento,created_at")
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId)
    .is("unidade_consumidora_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const correspondentes = (orfaos ?? []).filter((contrato) =>
    contratoCorrespondeAoNumeroUc(contrato, numeroUc)
  );
  const assinado = correspondentes.find((contrato) =>
    Boolean(contrato.aceite_cliente_em || contrato.contrato_assinado_url)
    && String(contrato.status).toUpperCase() === "VIGENTE"
  );
  if (!assinado) return null;

  const { data: restaurado, error: erroRestauracao } = await supabase
    .from("contratos")
    .update({ unidade_consumidora_id: unidadeId })
    .eq("id", assinado.id)
    .is("unidade_consumidora_id", null)
    .select("id")
    .single();
  if (erroRestauracao) throw erroRestauracao;

  const rascunhos = correspondentes
    .filter((contrato) => contrato.id !== assinado.id && !contrato.aceite_cliente_em && !contrato.contrato_assinado_url)
    .map((contrato) => contrato.id);
  if (rascunhos.length) {
    const { error: erroRascunhos } = await supabase
      .from("contratos")
      .update({ status: "CANCELADO" })
      .in("id", rascunhos);
    if (erroRascunhos) throw erroRascunhos;
  }
  return restaurado;
}

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

    // Um documento já aceito nunca é sobrescrito. A edição cria a próxima
    // versão e mantém a anterior integralmente no histórico da UC.
    if (existente.aceite_cliente_em || existente.contrato_assinado_url) {
      await atualizarContrato(existente.id, { status: "SUBSTITUIDO", revisao_configuracao_pendente: false });
      return await criarContrato({
        ...contrato,
        status: novoAtivo ? "ATIVO" : contrato.status,
        versao: Number(existente.versao ?? 1) + 1,
        revisao_configuracao_pendente: false,
      });
    }

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
