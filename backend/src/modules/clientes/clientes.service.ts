import {
  atualizarCliente,
  atualizarDadosFaturaAnexada,
  buscarCliente,
  buscarSolicitacaoCadastroCliente,
  buscarClientePorUC,
  buscarUnidadePorId,
  cadastrarUnidadeCliente,
  criarFaturaAnexadaCliente,
  criarCliente,
  excluirUnidadeCliente as excluirUnidadeClienteNoBanco,
  excluirFaturaAnexadaCliente as excluirFaturaAnexadaClienteNoBanco,
  excluirCliente as excluirClienteNoBanco,
  listarClientes,
  listarFaturasAnexadasCliente as listarFaturasAnexadasClienteNoBanco,
  listarTodasUnidades,
  listarUnidadesCliente,
  listarUnidadesPorCpf,
} from "./clientes.repository";
import { supabase } from "../../config/supabase";
import { recalcularAlocacaoUsina, sincronizarParticipacaoClienteUsina } from "../usinas/usinas.service";
import { extrairTextoDoBuffer, extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import { gerarToken } from "../../utils/token";
import { readFile, unlink } from "node:fs/promises";

export {
  atualizarCliente, buscarCliente,
  buscarClientePorUC,
  buscarUnidadePorId,
  cadastrarUnidadeCliente,
  criarCliente, listarClientes, listarTodasUnidades, listarUnidadesCliente, listarUnidadesPorCpf
};

function idsDeUsinas(...valores: Array<unknown>) {
  return [...new Set(
    valores
      .flatMap((valor) => Array.isArray(valor) ? valor : [valor])
      .map((valor: any) => String(valor?.usina_id ?? valor ?? "").trim())
      .filter(Boolean),
  )];
}

async function recalcularUsinasAfetadas(usinaIds: string[]) {
  await Promise.all(usinaIds.map((usinaId) => recalcularAlocacaoUsina(usinaId)));
}

async function listarUsinasDeParticipacaoDoCliente(clienteId: string, empresaId: string) {
  const { data, error } = await supabase
    .from("participacoes_usina")
    .select("usina_id")
    .eq("cliente_id", clienteId)
    .eq("empresa_id", empresaId);
  if (error && error.code !== "42P01") throw error;
  return data ?? [];
}

/**
 * A remoção da UC libera sua parcela de rateio imediatamente. O identificador
 * da usina é lido antes do delete porque não há mais como descobri-lo depois.
 */
export async function excluirUnidadeCliente(unidadeId: string, empresaId: string) {
  const unidade = await buscarUnidadePorId(unidadeId, empresaId);
  if (!unidade) throw new Error("Unidade consumidora não encontrada.");

  const usinaIds = idsDeUsinas(unidade);
  await excluirUnidadeClienteNoBanco(unidadeId, empresaId);
  if (unidade.cliente_id && unidade.usina_id) {
    await sincronizarParticipacaoClienteUsina(String(unidade.usina_id), String(unidade.cliente_id));
  }
  await recalcularUsinasAfetadas(usinaIds);
}

/**
 * Um cliente pode ter UCs em mais de uma usina. Ao removê-lo, recalculamos
 * todas elas para que ocupação, energia alocada e disponível não conservem
 * a alocação das UCs excluídas em cascata.
 */
export async function excluirCliente(clienteId: string, empresaId: string) {
  const [cliente, unidades, participacoes] = await Promise.all([
    buscarCliente(clienteId, empresaId),
    listarUnidadesCliente(clienteId, empresaId),
    listarUsinasDeParticipacaoDoCliente(clienteId, empresaId),
  ]);
  // Alguns cadastros antigos possuíam a participação registrada numa usina
  // diferente do campo legado do cliente/UC. Guardamos também esse vínculo
  // antes da exclusão para recalcular toda usina que possa ter sido afetada.
  const usinaIds = idsDeUsinas(cliente, unidades, participacoes);

  await excluirClienteNoBanco(clienteId, empresaId);
  await recalcularUsinasAfetadas(usinaIds);
}

function cpfLimpo(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "");
}

async function apagarArquivoTemporario(caminho?: string) {
  if (caminho) await unlink(caminho).catch(() => undefined);
}

async function guardarFaturaAnexada(clienteId: string, caminhoArquivo: string) {
  const conteudo = await readFile(caminhoArquivo);
  const caminhoPdf = `anexos-clientes/${clienteId}/${gerarToken()}.pdf`;
  const { error } = await supabase.storage.from("faturas").upload(caminhoPdf, conteudo, {
    contentType: "application/pdf",
    cacheControl: "0",
    upsert: false,
  });
  if (error) throw error;
  return caminhoPdf;
}

function dadosDaFaturaAnexada(dados: Record<string, any>) {
  return {
    ...dados,
    versaoExtracao: 3,
    titular: String(dados.cliente ?? dados.titular ?? "").trim(),
    endereco: String(dados.endereco ?? "").trim(),
    uc: String(dados.uc ?? dados.numero_instalacao ?? "").replace(/\D/g, ""),
    cpfParcial: cpfLimpo(dados.cpfParcial ?? dados.cpf).slice(0, 4),
    distribuidora: String(dados.distribuidora ?? "CEMIG").trim() || "CEMIG",
  };
}

function faturaPossuiDadosDeConsumo(dados: Record<string, any>) {
  const possuiConsumo = Number(dados?.consumo ?? dados?.consumo_kwh ?? 0) > 0 ||
    (Array.isArray(dados?.historico) && dados.historico.some((item: any) => Number(item?.consumo ?? 0) > 0));
  return possuiConsumo && Number(dados?.versaoExtracao ?? 0) >= 3;
}

async function completarDadosDaFaturaAnexada(anexo: any, cpf?: string | null) {
  const atuais = (anexo?.dados_fatura ?? {}) as Record<string, any>;
  if (faturaPossuiDadosDeConsumo(atuais) || !anexo?.caminho_pdf) return atuais;

  try {
    const { data, error } = await supabase.storage.from("faturas").download(String(anexo.caminho_pdf));
    if (error) throw error;
    const buffer = Buffer.from(await data.arrayBuffer());
    const texto = await extrairTextoDoBuffer(buffer, cpfLimpo(cpf).slice(0, 4) || undefined);
    const completos = dadosDaFaturaAnexada(interpretarFatura(texto) as Record<string, any>);
    if (!faturaPossuiDadosDeConsumo(completos)) return atuais;
    await atualizarDadosFaturaAnexada(String(anexo.id), String(anexo.empresa_id), completos);
    return completos;
  } catch (erro: any) {
    console.warn("[clientes:fatura-anexada] não foi possível completar dados antigos", {
      anexoId: anexo?.id,
      mensagem: String(erro?.message ?? erro),
    });
    return atuais;
  }
}

export async function listarFaturasAnexadasDoCliente(clienteId: string, usuario: any, empresaId: string) {
  if (usuario?.perfil === "LEITURA" && String(usuario?.cliente_id ?? "") !== String(clienteId)) {
    throw new Error("Você não possui acesso às faturas deste cliente.");
  }
  const [anexos, cliente] = await Promise.all([
    listarFaturasAnexadasClienteNoBanco(clienteId, empresaId),
    buscarCliente(clienteId, empresaId),
  ]);
  return Promise.all(anexos.map(async (anexo: any) => {
    const dadosFatura = await completarDadosDaFaturaAnexada(anexo, cliente?.cpf);
    const { data, error } = await supabase.storage.from("faturas").createSignedUrl(String(anexo.caminho_pdf), 5 * 60);
    if (error) throw error;
    return { id: anexo.id, nome: anexo.arquivo_nome, dadosFatura, criadoEm: anexo.criado_em, url: data.signedUrl };
  }));
}

export async function anexarFaturaAoCliente(
  clienteId: string,
  usuario: any,
  empresaId: string,
  arquivo?: { path: string; originalname?: string; mimetype?: string },
) {
  if (!arquivo?.path) throw new Error("Selecione uma fatura em PDF.");
  if (arquivo.mimetype && arquivo.mimetype !== "application/pdf") throw new Error("Envie a conta de energia no formato PDF.");
  if (usuario?.perfil === "LEITURA" && String(usuario?.cliente_id ?? "") !== String(clienteId)) {
    throw new Error("Você não possui acesso a este cliente.");
  }

  let caminhoPdf: string | null = null;
  try {
    const cliente = await buscarCliente(clienteId, empresaId);
    const texto = await extrairTextoPDF(arquivo.path, cpfLimpo(cliente?.cpf).slice(0, 4) || undefined);
    if (!/\bCEMIG\b/i.test(texto)) throw new Error("Envie uma fatura emitida pela CEMIG.");
    const dadosFatura = dadosDaFaturaAnexada(interpretarFatura(texto) as Record<string, any>);
    if (!dadosFatura.uc) throw new Error("Não foi possível identificar a unidade consumidora na fatura.");
    caminhoPdf = await guardarFaturaAnexada(clienteId, arquivo.path);
    const anexo = await criarFaturaAnexadaCliente({ clienteId, empresaId, usuarioId: usuario?.id ?? null, caminhoPdf, arquivoNome: arquivo.originalname || "fatura-cemig.pdf", dadosFatura });
    const unidade = await cadastrarUnidadeCliente(clienteId, dadosFatura.uc, cliente?.cpf ?? dadosFatura.cpfParcial, empresaId);
    const { error: unidadeError } = await supabase
      .from("unidades_consumidoras")
      .update({
        titular: dadosFatura.titular || cliente?.nome || null,
        endereco: dadosFatura.endereco || cliente?.endereco || null,
        distribuidora: dadosFatura.distribuidora || "CEMIG",
      })
      .eq("id", unidade.id)
      .eq("empresa_id", empresaId);
    if (unidadeError) throw unidadeError;
    const { data, error } = await supabase.storage.from("faturas").createSignedUrl(caminhoPdf, 5 * 60);
    if (error) throw error;
    return { id: anexo.id, nome: anexo.arquivo_nome, dadosFatura: anexo.dados_fatura, criadoEm: anexo.criado_em, url: data.signedUrl, unidade };
  } catch (erro) {
    if (caminhoPdf) await supabase.storage.from("faturas").remove([caminhoPdf]).catch(() => undefined);
    throw erro;
  } finally {
    await apagarArquivoTemporario(arquivo.path);
  }
}

export async function excluirFaturaAnexadaDoCliente(clienteId: string, anexoId: string, empresaId: string) {
  const anexo = await excluirFaturaAnexadaClienteNoBanco(anexoId, clienteId, empresaId);
  if (anexo?.caminho_pdf) {
    const { error } = await supabase.storage.from("faturas").remove([String(anexo.caminho_pdf)]);
    // O registro já foi removido. Uma eventual falha no storage não deve
    // ressuscitar a fatura na lista; o arquivo órfão pode ser limpo depois.
    if (error) console.warn("[clientes:fatura-anexada] arquivo não removido do storage", error.message);
  }
  return { sucesso: true };
}

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
  // Quem anexou uma fatura validada já foi liberado automaticamente. No
  // cadastro sem fatura não há validação de e-mail pendente: a confirmação do
  // gerador é justamente a autorização para liberar o acesso.
  if (solicitacao.fatura_cemig_url && !solicitacao.email_verificado_em) {
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
