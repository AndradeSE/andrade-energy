import { supabase } from "../../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../../config/empresa";
import { randomUUID } from "node:crypto";
import { restaurarContratoAssinadoDaMesmaUc } from "../contratos/contratos.repository";

const somenteDigitos = (valor: unknown) => String(valor ?? "").replace(/\D/g, "");

async function incluirTitularDaFatura(unidades: any[], empresaId: string) {
  const clienteIds = [...new Set(unidades.map((unidade) => String(unidade?.cliente_id ?? "")).filter(Boolean))];
  if (!clienteIds.length) return unidades;

  const { data: anexos, error } = await supabase
    .from("faturas_anexadas_clientes")
    .select("cliente_id,dados_fatura,criado_em")
    .eq("empresa_id", empresaId)
    .in("cliente_id", clienteIds)
    .order("criado_em", { ascending: false });
  if (error?.code === "42P01") return unidades;
  if (error) throw error;

  const titularPorUc = new Map<string, string>();
  for (const anexo of anexos ?? []) {
    const dados = (anexo?.dados_fatura ?? {}) as Record<string, any>;
    const numero = somenteDigitos(dados.uc ?? dados.numero_instalacao);
    const titular = String(dados.titular ?? dados.cliente ?? "").trim();
    if (numero && titular && !titularPorUc.has(numero)) titularPorUc.set(numero, titular);
  }

  return unidades.map((unidade) => {
    const titularFatura = titularPorUc.get(somenteDigitos(unidade?.numero)) ?? null;
    // Não confundir o nome cadastral do cliente com o titular efetivamente
    // lido na conta. Registros antigos sem PDF ficam explicitamente sem essa
    // identificação até uma fatura da UC ser anexada.
    return { ...unidade, titular_fatura: titularFatura };
  });
}

async function incluirEstadoContratoEConvite(unidades: any[], empresaId: string) {
  const ids = unidades.map((unidade) => String(unidade?.id ?? "")).filter((id) => id && !id.startsWith("cliente-"));
  if (!ids.length) return unidades;

  const [{ data: contratos, error: erroContratos }, { data: convites, error: erroConvites }] = await Promise.all([
    supabase
      .from("contratos")
      .select("id,unidade_consumidora_id,status,aceite_cliente_em,contrato_assinado_url,contrato_gerado_url,revisao_configuracao_pendente,dados_documento,created_at")
      .eq("empresa_id", empresaId)
      .in("unidade_consumidora_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("convites_clientes")
      .select("id,unidade_consumidora_id,status,expira_em,created_at")
      .eq("empresa_id", empresaId)
      .in("unidade_consumidora_id", ids)
      .order("created_at", { ascending: false }),
  ]);
  if (erroContratos && erroContratos.code !== "42P01") throw erroContratos;
  if (erroConvites && erroConvites.code !== "42P01") throw erroConvites;

  const contratoPorUc = new Map<string, any>();
  for (const contrato of contratos ?? []) {
    const unidadeId = String(contrato.unidade_consumidora_id ?? "");
    if (unidadeId && !contratoPorUc.has(unidadeId)) contratoPorUc.set(unidadeId, contrato);
  }
  const convitePorUc = new Map<string, any>();
  for (const convite of convites ?? []) {
    const unidadeId = String(convite.unidade_consumidora_id ?? "");
    if (unidadeId && !convitePorUc.has(unidadeId)) convitePorUc.set(unidadeId, convite);
  }

  return unidades.map((unidade) => ({
    ...unidade,
    contrato_resumo: contratoPorUc.get(String(unidade.id)) ?? null,
    convite_resumo: convitePorUc.get(String(unidade.id)) ?? null,
  }));
}

async function incluirStatusDoCadastro(clientes: any[], empresaId: string) {
  const ids = clientes.map((cliente) => String(cliente?.id ?? "")).filter(Boolean);
  if (!ids.length) return clientes;

  const { data: solicitacoes, error } = await supabase
    .from("solicitacoes_cadastro_clientes")
    .select("cliente_id,status,created_at")
    .eq("empresa_id", empresaId)
    .in("cliente_id", ids)
    .order("created_at", { ascending: false });
  // Permite que o código continue operando durante a janela entre deploy do
  // backend e aplicação da migração, sem esconder os clientes já existentes.
  if (error?.code === "42P01") return clientes;
  if (error) throw error;

  const statusPorCliente = new Map<string, string>();
  for (const solicitacao of solicitacoes ?? []) {
    const clienteId = String(solicitacao.cliente_id ?? "");
    if (!clienteId || statusPorCliente.has(clienteId)) continue;
    statusPorCliente.set(clienteId, String(solicitacao.status));
  }
  return clientes.map((cliente) => ({
    ...cliente,
    cadastro_status: statusPorCliente.get(String(cliente.id)) ?? null,
  }));
}

async function incluirConcessionariaDasUnidades(clientes: any[], empresaId: string) {
  const ids = clientes.map((cliente) => String(cliente?.id ?? "")).filter(Boolean);
  if (!ids.length) return clientes;

  const { data: unidades, error } = await supabase
    .from("unidades_consumidoras")
    .select("cliente_id,distribuidora,created_at")
    .eq("empresa_id", empresaId)
    .in("cliente_id", ids)
    .order("created_at", { ascending: false });
  if (error?.code === "42P01") return clientes;
  if (error) throw error;

  const concessionariaPorCliente = new Map<string, string>();
  for (const unidade of unidades ?? []) {
    const clienteId = String(unidade.cliente_id ?? "");
    const distribuidora = String(unidade.distribuidora ?? "").trim();
    if (clienteId && distribuidora && !concessionariaPorCliente.has(clienteId)) {
      concessionariaPorCliente.set(clienteId, distribuidora);
    }
  }

  return clientes.map((cliente) => ({
    ...cliente,
    distribuidora: concessionariaPorCliente.get(String(cliente.id)) || cliente.distribuidora || null,
  }));
}

async function incluirResumoContratos(clientes: any[], empresaId: string) {
  const ids = clientes.map((cliente) => String(cliente?.id ?? "")).filter(Boolean);
  if (!ids.length) return clientes;
  const { data: contratos, error } = await supabase.from("contratos")
    .select("id,cliente_id,status,created_at")
    .eq("empresa_id", empresaId)
    .in("cliente_id", ids)
    .order("created_at", { ascending: false });
  if (error?.code === "42P01") return clientes;
  if (error) throw error;
  const porCliente = new Map<string, any[]>();
  for (const contrato of contratos ?? []) {
    const clienteId = String(contrato.cliente_id ?? "");
    if (!clienteId) continue;
    porCliente.set(clienteId, [...(porCliente.get(clienteId) ?? []), contrato]);
  }
  return clientes.map((cliente) => {
    const lista = porCliente.get(String(cliente.id)) ?? [];
    return { ...cliente, total_contratos: lista.length, contratos_status: lista.map((item) => item.status) };
  });
}

export async function listarClientes(empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("nome");

  if (error) throw error;

  const clientesComConcessionaria = await incluirConcessionariaDasUnidades(data ?? [], empresaId);
  const clientesComContratos = await incluirResumoContratos(clientesComConcessionaria, empresaId);
  return incluirStatusDoCadastro(clientesComContratos, empresaId);
}

export async function buscarCliente(id: string, empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .single();

  if (error) throw error;

  const [clienteComConcessionaria] = await incluirConcessionariaDasUnidades([data], empresaId);
  const [clienteComContratos] = await incluirResumoContratos([clienteComConcessionaria], empresaId);
  return (await incluirStatusDoCadastro([clienteComContratos], empresaId))[0];
}

export async function buscarSolicitacaoCadastroCliente(clienteId: string, empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("solicitacoes_cadastro_clientes")
    .select("id,cliente_id,usuario_id,empresa_id,gestor_id,status,dados_fatura,fatura_cemig_url,email_verificado_em,confirmado_em,created_at")
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId)
    .limit(1)
    .maybeSingle();
  if (error?.code === "42P01") return null;
  if (error) throw error;
  return data;
}

export async function criarFaturaAnexadaCliente(input: {
  clienteId: string;
  empresaId: string;
  usuarioId?: string | null;
  caminhoPdf: string;
  arquivoNome: string;
  dadosFatura: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("faturas_anexadas_clientes")
    .insert({
      cliente_id: input.clienteId,
      empresa_id: input.empresaId,
      usuario_id: input.usuarioId ?? null,
      caminho_pdf: input.caminhoPdf,
      arquivo_nome: input.arquivoNome,
      dados_fatura: input.dadosFatura,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listarFaturasAnexadasCliente(clienteId: string, empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("faturas_anexadas_clientes")
    .select("id,cliente_id,empresa_id,usuario_id,caminho_pdf,arquivo_nome,dados_fatura,criado_em")
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId)
    .order("criado_em", { ascending: false });
  if (error?.code === "42P01") return [];
  if (error) throw error;
  return data ?? [];
}

export async function excluirFaturaAnexadaCliente(id: string, clienteId: string, empresaId: string) {
  const { data: anexo, error: buscaError } = await supabase
    .from("faturas_anexadas_clientes")
    .select("id,caminho_pdf")
    .eq("id", id)
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (buscaError) throw buscaError;
  if (!anexo) throw new Error("Fatura anexada não encontrada.");

  const { error } = await supabase
    .from("faturas_anexadas_clientes")
    .delete()
    .eq("id", id)
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId);
  if (error) throw error;
  return anexo;
}

export async function atualizarDadosFaturaAnexada(
  id: string,
  empresaId: string,
  dadosFatura: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from("faturas_anexadas_clientes")
    .update({ dados_fatura: dadosFatura })
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select("id,dados_fatura")
    .single();
  if (error) throw error;
  return data;
}

export async function listarUnidadesCliente(clienteId: string, empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("id, cliente_id, usina_id, numero, apelido, titular, distribuidora, endereco, status, modalidade_faturamento, desconto_percentual, clientes(id,nome), usinas(id,nome,titularidade_ucs_recebedoras)")
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId)
    .order("numero");

  if (!error && data?.length) {
    const comTitular = await incluirTitularDaFatura(data, empresaId);
    return incluirEstadoContratoEConvite(comTitular, empresaId);
  }
  if (error && error.code !== "42P01") throw error;

  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .select("id, uc, nome, distribuidora, endereco, status, usina_id, modalidade_faturamento, desconto_percentual")
    .eq("id", clienteId)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (erroCliente) throw erroCliente;
  if (!cliente?.uc) return [];

  return [{
    id: `cliente-${cliente.id}`,
    cliente_id: cliente.id,
    usina_id: cliente.usina_id,
    numero: String(cliente.uc),
    titular: cliente.nome,
    distribuidora: cliente.distribuidora,
    endereco: cliente.endereco,
    status: cliente.status,
    modalidade_faturamento: cliente.modalidade_faturamento,
    desconto_percentual: cliente.desconto_percentual,
    clientes: { id: cliente.id, nome: cliente.nome },
  }];
}

export async function listarTodasUnidades(empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("*, clientes(id,nome,cpf,endereco,email,whatsapp), usinas(id,nome,endereco,titularidade_ucs_recebedoras)")
    .not("cliente_id", "is", null)
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const comTitular = await incluirTitularDaFatura(data ?? [], empresaId);
  return incluirEstadoContratoEConvite(comTitular, empresaId);
}

export async function buscarUnidadePorId(unidadeId: string, empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .select("*, clientes(id,nome,cpf,endereco,email,whatsapp), usinas(id,nome,endereco)")
    .eq("id", unidadeId)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.usina_id || data.usinas?.nome) return data;

  // Não depende do embed do PostgREST: algumas UCs legadas possuem o ID
  // da usina válido, mas a relação ainda não é expandida na consulta.
  const { data: usina, error: erroUsina } = await supabase
    .from("usinas")
    .select("id,nome,endereco")
    .eq("id", data.usina_id)
    .maybeSingle();
  if (erroUsina) throw erroUsina;
  return { ...data, usinas: usina ?? null, usina_nome: usina?.nome ?? null };
}

export async function listarUnidadesPorCpf(cpfInformado: string, empresaId = EMPRESA_ANDRADE_ID) {
  const cpf = String(cpfInformado ?? "").replace(/\D/g, "");
  if (cpf.length !== 11) return [];
  const prefixoCpf = cpf.slice(0, 9);

  const { data: clientes, error: erroClientes } = await supabase
    .from("clientes")
    .select("id, cpf, uc, nome, distribuidora, endereco, status, usina_id")
    .like("cpf", `${prefixoCpf}%`)
    .eq("empresa_id", empresaId);
  // O CPF pode existir em empresas diferentes; somente a empresa ativa participa do vínculo.
  if (erroClientes) throw erroClientes;
  if (!clientes?.length) return [];
  const cpfsEncontrados = new Set(clientes.map((cliente) => String(cliente.cpf ?? "").replace(/\D/g, "")));
  if (cpfsEncontrados.size !== 1) return [];

  const clienteIds = clientes.map((cliente) => cliente.id);
  const { data: unidades, error: erroUnidades } = await supabase
    .from("unidades_consumidoras")
    .select("id, cliente_id, usina_id, numero, apelido, titular, distribuidora, endereco, status, modalidade_faturamento, usinas(id,nome,titularidade_ucs_recebedoras)")
    .in("cliente_id", clienteIds)
    .eq("empresa_id", empresaId)
    .order("numero");
  if (erroUnidades && erroUnidades.code !== "42P01") throw erroUnidades;

  const porNumero = new Map<string, any>();
  for (const unidade of unidades ?? []) porNumero.set(String(unidade.numero), unidade);
  for (const cliente of clientes) {
    if (!cliente.uc || porNumero.has(String(cliente.uc))) continue;
    porNumero.set(String(cliente.uc), {
      id: `cliente-${cliente.id}`,
      cliente_id: cliente.id,
      usina_id: cliente.usina_id,
      numero: String(cliente.uc),
      titular: cliente.nome,
      distribuidora: cliente.distribuidora,
      endereco: cliente.endereco,
      status: cliente.status,
    });
  }
  return incluirTitularDaFatura([...porNumero.values()], empresaId);
}

export async function atualizarApelidoDaMinhaUnidade(unidadeId: string, cpfInformado: string, apelidoInformado: string, empresaId = EMPRESA_ANDRADE_ID) {
  const cpf = String(cpfInformado ?? "").replace(/\D/g, "");
  if (cpf.length !== 11) throw new Error("CPF da conta não identificado.");
  const apelido = String(apelidoInformado ?? "").trim().slice(0, 40);
  const { data: clientes, error: erroClientes } = await supabase
    .from("clientes")
    .select("id,cpf")
    .eq("empresa_id", empresaId)
    .like("cpf", `${cpf.slice(0, 9)}%`);
  if (erroClientes) throw erroClientes;
  const clienteIds = (clientes ?? []).filter((item) => String(item.cpf ?? "").replace(/\D/g, "") === cpf).map((item) => item.id);
  if (!clienteIds.length) throw new Error("Cliente vinculado ao CPF não encontrado.");
  const { data, error } = await supabase
    .from("unidades_consumidoras")
    .update({ apelido: apelido || null })
    .eq("id", unidadeId)
    .eq("empresa_id", empresaId)
    .in("cliente_id", clienteIds)
    .select("id,numero,apelido")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Unidade não encontrada para esta conta.");
  return data;
}

export async function buscarClientePorUC(uc: string) {
  const ucNormalizada = String(uc).replace(/\D/g, "");

  const { data: unidade, error: erroUnidade } = await supabase
    .from("unidades_consumidoras")
    .select("*, clientes(*)")
    .eq("numero", ucNormalizada)
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

export async function criarCliente(cliente: any, empresaId = EMPRESA_ANDRADE_ID) {
  const { data, error } = await supabase
    .from("clientes")
    .insert({ ...cliente, empresa_id: empresaId })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function atualizarCliente(
  id: string,
  cliente: any,
  empresaId = EMPRESA_ANDRADE_ID,
) {
  const { data, error } = await supabase
    .from("clientes")
    .update(cliente)
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function excluirCliente(id: string, empresaId = EMPRESA_ANDRADE_ID) {
  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .select("cpf")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (erroCliente) throw erroCliente;

  const cpf = String(cliente?.cpf ?? "").replace(/\D/g, "");
  const { data: contas, error: erroBuscaContas } = await supabase
    .from("usuarios")
    .select("id,perfil,empresa_id")
    .eq("cliente_id", id);
  if (erroBuscaContas) throw erroBuscaContas;

  const { data: cadastrosAlternativos, error: erroAlternativos } = cpf.length === 11
    ? await supabase.from("clientes").select("id,empresa_id").eq("cpf", cpf).neq("id", id)
    : { data: [], error: null };
  if (erroAlternativos) throw erroAlternativos;

  // O histórico de consumo pertence à fatura, não diretamente ao cliente.
  // Resolvemos primeiro as faturas para funcionar também nos bancos legados,
  // nos quais historico_consumo nunca recebeu a coluna cliente_id.
  const { data: faturasDoCliente, error: erroBuscaFaturas } = await supabase
    .from("faturas")
    .select("id")
    .eq("cliente_id", id);
  if (erroBuscaFaturas && erroBuscaFaturas.code !== "42P01") throw erroBuscaFaturas;

  const faturaIds = (faturasDoCliente ?? []).map((fatura) => String(fatura.id));
  if (faturaIds.length) {
    for (const tabela of ["historico_consumo", "debitos_fatura"]) {
      const { error } = await supabase.from(tabela).delete().in("fatura_id", faturaIds);
      if (error && error.code !== "42P01") throw error;
    }
  }

  // Tabelas de onboarding conservam vínculo direto com o cliente. Alguns
  // bancos antigos possuem essas FKs como RESTRICT, portanto removemos
  // explicitamente antes do cadastro principal.
  for (const tabela of [
    "faturas_anexadas_clientes",
    "solicitacoes_cadastro_clientes",
  ]) {
    const { error } = await supabase.from(tabela).delete().eq("cliente_id", id);
    if (error && error.code !== "42P01") throw error;
  }

  const tabelasDependentes = [
    "notificacoes_fatura",
    "cobrancas",
    "creditos_cliente",
    "creditos",
    "rateios",
    "faturas",
    "unidades_consumidoras",
  ];

  // Nessas duas tabelas legadas a remoção direta por cliente_id pode exceder
  // o statement timeout por falta de índice. Buscar e apagar pela PK evita a
  // varredura prolongada e mantém a operação previsível.
  for (const tabela of ["participacoes_usina", "contratos"]) {
    const { data: vinculos, error: erroBusca } = await supabase
      .from(tabela)
      .select("id")
      .eq("cliente_id", id);
    if (erroBusca && erroBusca.code !== "42P01") throw erroBusca;
    for (const vinculo of vinculos ?? []) {
      const { error } = await supabase.from(tabela).delete().eq("id", vinculo.id);
      if (error) throw error;
    }
  }

  for (const tabela of tabelasDependentes) {
    // cliente_id é globalmente único. Não filtramos empresa_id aqui porque
    // registros legados podem ter sido gravados no tenant errado; o outro
    // cadastro da mesma pessoa possui outro UUID e permanece intacto.
    const { error } = await supabase.from(tabela).delete().eq("cliente_id", id);
    if (error && error.code !== "42P01") throw error;
  }

  const { error: erroConvites } = await supabase.from("convites_clientes").update({ cliente_id: null }).eq("cliente_id", id);
  if (erroConvites) throw erroConvites;

  // Uma pessoa pode ser cliente de várias empresas. Ao remover apenas este
  // cadastro, preservamos a conta e apontamos o consumidor para outro cadastro
  // do mesmo CPF. Gestores e administradores somente perdem o vínculo legado.
  for (const conta of contas ?? []) {
    const contaId = String(conta.id);
    const alternativo = (cadastrosAlternativos ?? []).find(
      (cadastro) => String(cadastro.empresa_id) === String(conta.empresa_id),
    ) ?? cadastrosAlternativos?.[0];

    if (conta.perfil !== "LEITURA" || alternativo) {
      const { error: erroDesvinculo } = await supabase
        .from("usuarios")
        .update({ cliente_id: conta.perfil === "LEITURA" ? alternativo?.id ?? null : null })
        .eq("id", contaId);
      if (erroDesvinculo) throw erroDesvinculo;
      continue;
    }

    const { error: erroDesativacao } = await supabase
      .from("usuarios")
      .update({
        ativo: false,
        cliente_id: null,
        cpf: null,
        email: `excluido-${contaId}@conta-inativa.local`,
        senha: `revogada-${randomUUID()}`,
      })
      .eq("id", contaId);
    if (erroDesativacao) throw erroDesativacao;

    const { error: erroSessoes } = await supabase
      .from("sessoes_usuarios")
      .update({ revogada_em: new Date().toISOString() })
      .eq("usuario_id", contaId)
      .is("revogada_em", null);
    if (erroSessoes && erroSessoes.code !== "42P01") throw erroSessoes;
  }

  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id)
    .eq("empresa_id", empresaId);

  if (error) throw error;
}

export async function cadastrarUnidadeCliente(clienteId: string, numeroInformado: string, cpfTitularInformado?: string, empresaId = EMPRESA_ANDRADE_ID) {
  const numero = String(numeroInformado ?? "").replace(/\D/g, "");
  if (!numero) throw new Error("Número da unidade consumidora não informado.");

  const cliente = await buscarCliente(clienteId, empresaId);
  const solicitacao = await buscarSolicitacaoCadastroCliente(clienteId, empresaId);
  if (solicitacao && solicitacao.status !== "ATIVO") {
    throw new Error("Confirme o cadastro do consumidor antes de ativar ou adicionar unidades.");
  }
  const { data: existente, error: erroConsulta } = await supabase
    .from("unidades_consumidoras")
    .select("id,cliente_id")
    .eq("numero", numero)
    .eq("empresa_id", empresaId)
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
    cpf_titular: String(cpfTitularInformado ?? cliente.cpf ?? "").replace(/\D/g, "") || null,
    status: "PENDENTE_CONTRATO",
    empresa_id: empresaId,
  };
  const resultado = existente
    ? await supabase.from("unidades_consumidoras").update(dados).eq("id", existente.id).select().single()
    : await supabase.from("unidades_consumidoras").insert(dados).select().single();
  if (resultado.error) throw resultado.error;
  const contratoRestaurado = await restaurarContratoAssinadoDaMesmaUc(
    clienteId,
    resultado.data.id,
    numero,
    empresaId,
  );
  if (contratoRestaurado) {
    const { error: erroAtivacao } = await supabase
      .from("unidades_consumidoras")
      .update({ status: "ATIVA" })
      .eq("id", resultado.data.id)
      .eq("empresa_id", empresaId);
    if (erroAtivacao) throw erroAtivacao;
  }
  return { ...resultado.data, status: contratoRestaurado ? "ATIVA" : "PENDENTE_CONTRATO", contrato_restaurado: Boolean(contratoRestaurado) };
}

export async function excluirUnidadeCliente(unidadeId: string, empresaId = EMPRESA_ANDRADE_ID) {
  const { data: unidade, error: erroUnidade } = await supabase
    .from("unidades_consumidoras")
    .select("id, numero, cliente_id")
    .eq("id", unidadeId)
    .eq("empresa_id", empresaId)
    .maybeSingle();

  if (erroUnidade) throw erroUnidade;
  // A exclusão pode ter sido concluída no servidor enquanto o aplicativo
  // ainda exibe a tela em cache. Nesse caso, repetir a operação deve ser
  // considerado sucesso para permitir que a interface volte à lista.
  if (!unidade) return;

  const clienteId = unidade.cliente_id;

  // Compatibilidade com o campo legado clientes.uc: sem essa limpeza, uma UC
  // removida pode reaparecer nos fluxos que ainda consultam esse campo. A UC
  // antiga pode estar salva com pontos, espaços ou hífens, por isso comparamos
  // somente os dígitos antes de limpar.
  if (clienteId) {
    const { data: cliente, error: erroCliente } = await supabase
      .from("clientes")
      .select("uc")
      .eq("id", clienteId)
      .maybeSingle();
    if (erroCliente) throw erroCliente;

    const ucLegada = String(cliente?.uc ?? "").replace(/\D/g, "");
    const ucExcluida = String(unidade.numero ?? "").replace(/\D/g, "");
    if (ucLegada && ucLegada === ucExcluida) {
      const { error: erroLegado } = await supabase
        .from("clientes")
        .update({ uc: null })
        .eq("id", clienteId);
      if (erroLegado) throw erroLegado;
    }
  }

  // O vínculo histórico usa ON DELETE SET NULL para proteger migrações antigas.
  // Na exclusão explícita feita pelo titular, porém, o contrato pertence à UC e
  // deve ser removido antes dela para não permanecer como documento órfão.
  const { error: erroContratos } = await supabase
    .from("contratos")
    .delete()
    .eq("unidade_consumidora_id", unidade.id)
    .eq("empresa_id", empresaId);
  if (erroContratos) throw erroContratos;

  const { error: erroExclusao } = await supabase
    .from("unidades_consumidoras")
    .delete()
    .eq("id", unidade.id);
  if (erroExclusao) throw erroExclusao;
}
