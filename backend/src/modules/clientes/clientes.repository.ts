import { supabase } from "../../config/supabase";

export async function listarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome");

  if (error) throw error;

  return data ?? [];
}

export async function buscarCliente(id: string) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

export async function listarUnidadesCliente(clienteId: string) {
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id, numero, titular, distribuidora, endereco, status, modalidade_faturamento")
    .eq("cliente_id", clienteId)
    .order("numero");

  if (!error && data?.length) return data;
  if (error && error.code !== "42P01") throw error;

  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .select("id, uc, nome, distribuidora, endereco, status")
    .eq("id", clienteId)
    .maybeSingle();

  if (erroCliente) throw erroCliente;
  if (!cliente?.uc) return [];

  return [{
    id: `cliente-${cliente.id}`,
    numero: String(cliente.uc),
    titular: cliente.nome,
    distribuidora: cliente.distribuidora,
    endereco: cliente.endereco,
    status: cliente.status,
  }];
}

export async function listarUnidadesPorCpf(cpfInformado: string) {
  const cpf = String(cpfInformado ?? "").replace(/\D/g, "");
  if (cpf.length !== 11) return [];
  const prefixoCpf = cpf.slice(0, 9);

  const { data: clientes, error: erroClientes } = await supabase
    .from("clientes")
    .select("id, cpf, uc, nome, distribuidora, endereco, status")
    .like("cpf", `${prefixoCpf}%`);
  if (erroClientes) throw erroClientes;
  if (!clientes?.length) return [];
  const cpfsEncontrados = new Set(clientes.map((cliente) => String(cliente.cpf ?? "").replace(/\D/g, "")));
  if (cpfsEncontrados.size !== 1) return [];

  const clienteIds = clientes.map((cliente) => cliente.id);
  const { data: unidades, error: erroUnidades } = await supabase
    .from("unidades_consumidoras")
    .select("id, cliente_id, numero, titular, distribuidora, endereco, status, modalidade_faturamento")
    .in("cliente_id", clienteIds)
    .order("numero");
  if (erroUnidades && erroUnidades.code !== "42P01") throw erroUnidades;

  const porNumero = new Map<string, any>();
  for (const unidade of unidades ?? []) porNumero.set(String(unidade.numero), unidade);
  for (const cliente of clientes) {
    if (!cliente.uc || porNumero.has(String(cliente.uc))) continue;
    porNumero.set(String(cliente.uc), {
      id: `cliente-${cliente.id}`,
      cliente_id: cliente.id,
      numero: String(cliente.uc),
      titular: cliente.nome,
      distribuidora: cliente.distribuidora,
      endereco: cliente.endereco,
      status: cliente.status,
    });
  }
  return [...porNumero.values()];
}

export async function buscarClientePorUC(uc: string) {
  const ucNormalizada = String(uc).replace(/\D/g, "");

  const { data: unidade, error: erroUnidade } = await supabase
    .from("unidades_consumidoras")
    .select("*, clientes(*)")
    .eq("numero", ucNormalizada)
    .eq("status", "ATIVA")
    .maybeSingle();

  if (!erroUnidade && unidade?.clientes) {
    return {
      ...unidade.clientes,
      usina_id: unidade.usina_id ?? unidade.clientes.usina_id,
      modalidade_faturamento:
        unidade.modalidade_faturamento ?? unidade.clientes.modalidade_faturamento,
      desconto_percentual:
        unidade.desconto_percentual ?? unidade.clientes.desconto_percentual,
      unidade_consumidora: unidade,
    };
  }

  if (erroUnidade && erroUnidade.code !== "42P01") {
    throw erroUnidade;
  }

  const { data, error } = await supabase
    .from("clientes")
    .select("*");

  if (error) throw error;

  for (const cliente of data ?? []) {
    const ucBanco = String(cliente.uc ?? "").replace(/\D/g, "");

    if (ucBanco === ucNormalizada) {
      return { ...cliente, unidade_consumidora: null };
    }
  }

  return null;
}

export async function criarCliente(cliente: any) {
  const { data, error } = await supabase
    .from("clientes")
    .insert(cliente)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function atualizarCliente(
  id: string,
  cliente: any
) {
  const { data, error } = await supabase
    .from("clientes")
    .update(cliente)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function excluirCliente(id: string) {
  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .select("cpf")
    .eq("id", id)
    .maybeSingle();
  if (erroCliente) throw erroCliente;

  const tabelasDependentes = [
    "notificacoes_fatura",
    "cobrancas",
    "creditos_cliente",
    "creditos",
    "rateios",
    "participacoes_usina",
    "contratos",
    "faturas",
    "unidades_consumidoras",
  ];

  for (const tabela of tabelasDependentes) {
    const { error } = await supabase.from(tabela).delete().eq("cliente_id", id);
    if (error && error.code !== "42P01") throw error;
  }

  await supabase.from("convites_clientes").update({ cliente_id: null }).eq("cliente_id", id);

  const cpf = String(cliente?.cpf ?? "").replace(/\D/g, "");
  const filtroConta = cpf.length === 11
    ? `cliente_id.eq.${id},cpf.eq.${cpf}`
    : `cliente_id.eq.${id}`;
  const { error: erroContas } = await supabase
    .from("usuarios")
    .delete()
    .eq("perfil", "LEITURA")
    .or(filtroConta);
  if (erroContas) throw erroContas;

  const { error: erroDesvinculo } = await supabase
    .from("usuarios")
    .update({ cliente_id: null })
    .eq("cliente_id", id);
  if (erroDesvinculo) throw erroDesvinculo;

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function cadastrarUnidadeCliente(clienteId: string, numeroInformado: string) {
  const numero = String(numeroInformado ?? "").replace(/\D/g, "");
  if (!numero) throw new Error("Número da unidade consumidora não informado.");

  const cliente = await buscarCliente(clienteId);
  const { data: existente, error: erroConsulta } = await supabase
    .from("unidades_consumidoras")
    .select("id,cliente_id")
    .eq("numero", numero)
    .maybeSingle();
  if (erroConsulta) throw erroConsulta;
  if (existente?.cliente_id && existente.cliente_id !== clienteId) {
    throw new Error("Esta UC já está vinculada a outro cliente.");
  }

  const dados = {
    numero,
    titular: cliente.nome ?? null,
    tipo: "BENEFICIARIA",
    cliente_id: clienteId,
    usina_id: cliente.usina_id ?? null,
    distribuidora: cliente.distribuidora || "CEMIG",
    endereco: cliente.endereco ?? null,
    modalidade_faturamento: cliente.modalidade_faturamento || "COMPENSACAO",
    desconto_percentual: Number(cliente.desconto_percentual ?? 40),
    status: "ATIVA",
  };
  const resultado = existente
    ? await supabase.from("unidades_consumidoras").update(dados).eq("id", existente.id).select().single()
    : await supabase.from("unidades_consumidoras").insert(dados).select().single();
  if (resultado.error) throw resultado.error;
  return resultado.data;
}
