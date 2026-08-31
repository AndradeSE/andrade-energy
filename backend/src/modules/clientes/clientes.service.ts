import {
  atualizarCliente,
  buscarCliente,
  buscarSolicitacaoCadastroCliente,
  buscarClientePorUC,
  buscarUnidadePorId,
  cadastrarUnidadeCliente,
  criarCliente,
  excluirUnidadeCliente,
  excluirCliente,
  listarClientes,
  listarTodasUnidades,
  listarUnidadesCliente,
  listarUnidadesPorCpf,
} from "./clientes.repository";
import { supabase } from "../../config/supabase";

export {
  atualizarCliente, buscarCliente,
  buscarClientePorUC,
  buscarUnidadePorId,
  cadastrarUnidadeCliente,
  criarCliente, excluirCliente, excluirUnidadeCliente, listarClientes, listarTodasUnidades, listarUnidadesCliente, listarUnidadesPorCpf
};

export async function cadastrarClienteAutomaticamente(dados: {
  nome: string;
  uc: string;
  distribuidora: string;
}) {
  return criarCliente({
    nome: dados.nome,
    uc: dados.uc,
    numero_instalacao: dados.uc,
    distribuidora: dados.distribuidora,
    status: "ATIVO",
  });
}

export async function obterSolicitacaoCadastroCliente(clienteId: string, empresaId: string) {
  const solicitacao = await buscarSolicitacaoCadastroCliente(clienteId, empresaId);
  if (!solicitacao) return null;

  let faturaUrl: string | null = null;
  if (solicitacao.fatura_cemig_url) {
    const { data, error } = await supabase.storage
      .from("faturas")
      .createSignedUrl(String(solicitacao.fatura_cemig_url), 5 * 60);
    if (error) throw error;
    faturaUrl = data.signedUrl;
  }

  return {
    id: solicitacao.id,
    status: solicitacao.status,
    dadosFatura: solicitacao.dados_fatura ?? {},
    emailVerificadoEm: solicitacao.email_verificado_em ?? null,
    confirmadoEm: solicitacao.confirmado_em ?? null,
    criadoEm: solicitacao.created_at,
    faturaUrl,
  };
}

export async function confirmarCadastroCliente(
  clienteId: string,
  confirmadorId: string,
  empresaId: string,
) {
  const solicitacao = await buscarSolicitacaoCadastroCliente(clienteId, empresaId);
  if (!solicitacao) throw new Error("Nenhum cadastro pendente foi encontrado para este cliente.");
  if (!solicitacao.email_verificado_em) {
    throw new Error("O cliente ainda precisa confirmar o e-mail antes da aprovação.");
  }
  if (!["AGUARDANDO_CONFIRMACAO_GERADOR", "ATIVO"].includes(String(solicitacao.status))) {
    throw new Error("Este cadastro não está disponível para confirmação.");
  }

  const cliente = await buscarCliente(clienteId, empresaId);
  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("id,cliente_id")
    .eq("id", solicitacao.usuario_id)
    .eq("perfil", "LEITURA")
    .maybeSingle();
  if (usuarioError) throw usuarioError;
  if (!usuario || usuario.cliente_id !== clienteId) {
    throw new Error("A conta do consumidor não está vinculada corretamente a este cliente.");
  }

  const dadosFatura = (solicitacao.dados_fatura ?? {}) as Record<string, any>;
  const numeroUc = String(dadosFatura.uc ?? cliente.uc ?? "").replace(/\D/g, "");
  if (numeroUc) {
    const { data: unidadeExistente, error: unidadeBuscaError } = await supabase
      .from("unidades_consumidoras")
      .select("id,cliente_id,empresa_id")
      .eq("numero", numeroUc)
      .maybeSingle();
    if (unidadeBuscaError) throw unidadeBuscaError;
    if (unidadeExistente && (
      unidadeExistente.cliente_id !== clienteId ||
      unidadeExistente.empresa_id !== empresaId
    )) {
      throw new Error("Esta UC já está vinculada a outro cliente ou empresa.");
    }

    const dadosUnidade = {
      cliente_id: clienteId,
      usina_id: cliente.usina_id ?? null,
      numero: numeroUc,
      tipo: "BENEFICIARIA",
      titular: dadosFatura.titular || cliente.nome,
      distribuidora: "CEMIG",
      endereco: dadosFatura.endereco || cliente.endereco || null,
      modalidade_faturamento: cliente.modalidade_faturamento ?? "COMPENSACAO",
      desconto_percentual: Number(cliente.desconto_percentual ?? 40),
      cpf_titular: cliente.cpf ?? null,
      status: "ATIVA",
      empresa_id: empresaId,
    };
    const resultadoUnidade = unidadeExistente
      ? await supabase.from("unidades_consumidoras").update(dadosUnidade).eq("id", unidadeExistente.id)
      : await supabase.from("unidades_consumidoras").insert(dadosUnidade);
    if (resultadoUnidade.error) throw resultadoUnidade.error;
  }

  const { data: clienteAtivo, error: clienteError } = await supabase
    .from("clientes")
    .update({ status: "ATIVO" })
    .eq("id", clienteId)
    .eq("empresa_id", empresaId)
    .select("*")
    .single();
  if (clienteError) throw clienteError;

  const agora = new Date().toISOString();
  const { error: empresaUsuarioError } = await supabase
    .from("empresa_usuarios")
    .update({ ativo: true, atualizado_em: agora })
    .eq("empresa_id", empresaId)
    .eq("usuario_id", usuario.id);
  if (empresaUsuarioError) throw empresaUsuarioError;

  const { error: solicitacaoError } = await supabase
    .from("solicitacoes_cadastro_clientes")
    .update({ status: "ATIVO", confirmado_por: confirmadorId, confirmado_em: agora, updated_at: agora })
    .eq("id", solicitacao.id)
    .eq("empresa_id", empresaId);
  if (solicitacaoError) throw solicitacaoError;

  // Esta é a última alteração: até aqui a conta permanece incapaz de entrar,
  // inclusive se houver falha ao ativar a UC ou registrar a confirmação.
  const { error: usuarioAtivoError } = await supabase
    .from("usuarios")
    .update({ ativo: true })
    .eq("id", usuario.id)
    .eq("empresa_id", empresaId);
  if (usuarioAtivoError) throw usuarioAtivoError;

  return { ...clienteAtivo, cadastro_status: "ATIVO" };
}
