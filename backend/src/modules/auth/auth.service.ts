import {
  atualizarPerfilUsuario,
  buscarUsuario,
  buscarUsuarioConsumidorPorEmail,
  buscarUsuarioPorCredenciais,
  buscarSolicitacaoPorTokenVerificacao,
  buscarSolicitacaoPorUsuario,
  criarSolicitacaoCadastroCliente,
  criarConta,
  desativarUsuario,
  invalidarSessoesUsuario,
  listarUsuarios,
  login,
  atualizarSolicitacaoCadastroCliente,
  vincularUsuarioAoClientePendente,
  vincularClientePorCpf,
} from "./auth.repository";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import { supabase } from "../../config/supabase";
import { gerarToken, hashToken } from "../../utils/token";
import { aceitarConvite, aceitarConviteGerador, concluirConviteGerador } from "../convites/convites.service";
import { contratarPlano } from "../comercial/comercial.service";
import { extrairTextoPDF } from "../../services/ocr/ocr.service";
import { interpretarFatura } from "../../services/ocr/parser.service";
import { readFile, unlink } from "node:fs/promises";

type DadosPerfil = {
  nome?: unknown;
  email?: unknown;
  telefone?: unknown;
  cpf?: unknown;
};

function cpfLimpo(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "");
}

function emailNormalizado(valor: unknown) {
  return String(valor ?? "").trim().toLowerCase();
}

function escaparHtml(valor: unknown) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[caractere] ?? caractere
  ));
}

function normalizarNome(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nomesCompativeis(nomeInformado: unknown, nomeDaFatura: unknown) {
  const palavrasIgnoradas = new Set(["DA", "DE", "DI", "DO", "DOS", "DAS", "E"]);
  const palavras = (valor: unknown) => new Set(
    normalizarNome(valor)
      .split(" ")
      .filter((palavra) => palavra.length >= 3 && !palavrasIgnoradas.has(palavra)),
  );
  const informadas = palavras(nomeInformado);
  const fatura = palavras(nomeDaFatura);
  if (!informadas.size || !fatura.size) return false;
  let comuns = 0;
  for (const palavra of informadas) if (fatura.has(palavra)) comuns += 1;
  return comuns >= Math.min(2, informadas.size, fatura.size);
}

function cpfDaFaturaConfere(cpf: string, dados: Record<string, any>) {
  const cpfCompleto = cpfLimpo(dados.cpf);
  if (cpfCompleto && cpfCompleto.length !== 11) return false;
  const primeirosQuatro = cpf.slice(0, 4);
  if (cpfCompleto && cpfCompleto.length === 11) {
    return cpfCompleto.slice(0, 4) === primeirosQuatro;
  }

  const cpfParcial = cpfLimpo(dados.cpfParcial);
  // O CPF usado para abrir PDFs CEMIG protegidos são os quatro primeiros
  // dígitos. Quando a fatura também os expõe, a conferência é explícita;
  // quando traz o CPF completo, usamos os mesmos quatro dígitos iniciais.
  return cpfParcial.length >= 4 && cpfParcial.slice(0, 4) === primeirosQuatro;
}

function dadosDeCadastroDaFatura(dados: Record<string, any>) {
  return {
    titular: String(dados.cliente ?? "").trim(),
    endereco: String(dados.endereco ?? "").trim(),
    uc: String(dados.uc ?? "").replace(/\D/g, ""),
    cpfParcial: cpfLimpo(dados.cpfParcial) || cpfLimpo(dados.cpf).slice(-4),
    classificacao: String(dados.classificacao ?? "").trim(),
    tensao: String(dados.tensao ?? "").trim(),
    distribuidora: "CEMIG",
  };
}

async function apagarArquivoTemporario(caminho?: string) {
  if (!caminho) return;
  await unlink(caminho).catch(() => undefined);
}

async function guardarFaturaDeCadastro(caminhoArquivo: string) {
  const conteudo = await readFile(caminhoArquivo);
  const caminhoPrivado = `cadastros-clientes/${gerarToken()}.pdf`;
  const { error } = await supabase.storage.from("faturas").upload(caminhoPrivado, conteudo, {
    contentType: "application/pdf",
    cacheControl: "0",
    upsert: false,
  });
  if (error) throw error;
  return caminhoPrivado;
}

async function enviarEmailDeVerificacaoCadastro(input: { nome: string; email: string; token: string }) {
  const link = `andradeenergyconsumidor://verificar-email?token=${encodeURIComponent(input.token)}`;
  return enviarEmailTransacional({
    destinatario: input.email,
    assunto: "Confirme seu e-mail — Andrade Energy",
    html: `<div style="max-width:560px;margin:auto;padding:28px;font-family:Arial,sans-serif;color:#252925;line-height:1.6;background:#f7f8f7;border-radius:14px"><h2 style="margin-top:0;color:#39804a">Confirme seu e-mail</h2><p>Olá, <strong>${escaparHtml(input.nome)}</strong>.</p><p>Recebemos seu cadastro e a sua fatura CEMIG. Confirme este e-mail para enviarmos a solicitação ao seu gerador.</p><p style="margin:26px 0"><a href="${link}" style="display:inline-block;padding:14px 22px;background:#39804a;color:#fff;font-weight:700;text-decoration:none;border-radius:8px">Confirmar meu e-mail</a></p><p style="font-size:13px;color:#6b706b">Após a confirmação, o gerador conferirá o cadastro. Seu acesso será liberado somente quando ele aprovar a solicitação.</p><p style="font-size:13px;color:#6b706b">Este link é válido por 24 horas. Se você não solicitou este cadastro, ignore esta mensagem.</p></div>`,
  });
}

function telefoneNormalizado(valor: unknown) {
  const telefone = String(valor ?? "").replace(/\D/g, "");
  if (!telefone) return null;
  if (telefone.length < 10 || telefone.length > 11) {
    throw new Error("Informe um telefone válido com DDD.");
  }
  return telefone;
}

function usuarioPublico(usuario: any) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    cpf: usuario.cpf ?? null,
    email: usuario.email,
    telefone: usuario.telefone ?? null,
    perfil: usuario.perfil,
    cliente_id: usuario.cliente_id ?? null,
    usina_id: usuario.usina_id ?? null,
    empresa_id: usuario.empresa_id ?? null,
  };
}

export async function autenticar(
  email: string,
  senha: string,
  tipo?: "CONSUMIDOR" | "GERADOR"
) {
  const emailSeguro = emailNormalizado(email);
  const usuario = await login(emailSeguro, senha, tipo);

  if (!usuario) {
    // Contas em onboarding ficam inativas por segurança. Identificamos esse
    // caso somente depois de a senha também conferir, para orientar a pessoa
    // sem revelar a existência de contas a terceiros.
    const contaPendente = await buscarUsuarioPorCredenciais(emailSeguro, senha, tipo).catch(() => null);
    if (contaPendente?.perfil === "LEITURA" && contaPendente.ativo === false) {
      const solicitacao = await buscarSolicitacaoPorUsuario(contaPendente.id).catch(() => null);
      if (solicitacao?.status === "AGUARDANDO_VERIFICACAO_EMAIL") {
        throw new Error("Confirme o e-mail enviado para concluir esta etapa do cadastro.");
      }
      if (solicitacao?.status === "AGUARDANDO_CONFIRMACAO_GERADOR") {
        throw new Error("Seu e-mail já foi confirmado. O cadastro agora aguarda a aprovação do gerador.");
      }
    }
    throw new Error("E-mail ou senha inválidos.");
  }

  const clienteId = await vincularClientePorCpf(usuario);
  const token = gerarToken();
  const { error: sessaoError } = await supabase.rpc("criar_sessao_unica", {
    p_usuario_id: usuario.id,
    p_token_hash: hashToken(token),
    p_expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (sessaoError) throw sessaoError;

  return {
    token,
    usuario: {
      ...usuarioPublico(usuario),
      cliente_id: clienteId ?? usuario.cliente_id,
    },
  };
}

export async function obterMeuPerfil(usuarioId: string) {
  const usuario = await buscarUsuario(usuarioId);
  if (!usuario?.ativo) throw new Error("Conta não está ativa.");
  return usuarioPublico(usuario);
}

export async function atualizarMeuPerfil(usuarioId: string, dados: DadosPerfil) {
  const usuarioAtual = await buscarUsuario(usuarioId);
  if (!usuarioAtual?.ativo) throw new Error("Conta não está ativa.");

  const nome = String(dados.nome ?? "").trim();
  const email = emailNormalizado(dados.email);
  const telefone = telefoneNormalizado(dados.telefone);

  if (!nome) throw new Error("Informe seu nome completo.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um e-mail válido.");
  }

  // O CPF define a associação da conta com o cadastro do cliente e suas UCs.
  // Aceitamos somente o mesmo valor para impedir a troca de identidade pelo app.
  if (dados.cpf !== undefined && cpfLimpo(dados.cpf) !== cpfLimpo(usuarioAtual.cpf)) {
    throw new Error("O CPF não pode ser alterado pelo aplicativo. Entre em contato com a Andrade Energy.");
  }

  try {
    const usuario = await atualizarPerfilUsuario(usuarioId, { nome, email, telefone });
    return usuarioPublico(usuario);
  } catch (erro: any) {
    if (erro?.code === "23505") {
      throw new Error("Já existe uma conta deste perfil com este e-mail.");
    }
    throw erro;
  }
}

export async function alterarMinhaSenha(usuarioId: string, senhaAtual: unknown, novaSenha: unknown) {
  const usuario = await buscarUsuario(usuarioId);
  if (!usuario?.ativo) throw new Error("Conta não está ativa.");
  if (!String(senhaAtual ?? "")) throw new Error("Informe sua senha atual.");
  if (usuario.senha !== String(senhaAtual)) throw new Error("A senha atual está incorreta.");
  if (String(novaSenha ?? "").length < 6) {
    throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
  }

  const { error } = await supabase
    .from("usuarios")
    .update({ senha: String(novaSenha) })
    .eq("id", usuarioId);
  if (error) throw error;

  // Após trocar a senha, todos os aparelhos precisam se autenticar novamente.
  await invalidarSessoesUsuario(usuarioId);
  return { message: "Senha alterada com sucesso. Entre novamente no aplicativo." };
}

export async function excluirMinhaConta(usuarioId: string, senhaAtual: unknown) {
  const usuario = await buscarUsuario(usuarioId);
  if (!usuario?.ativo) throw new Error("Esta conta já foi desativada.");
  if (!String(senhaAtual ?? "")) throw new Error("Informe sua senha para excluir a conta.");
  if (usuario.senha !== String(senhaAtual)) throw new Error("A senha informada está incorreta.");

  // A conta deixa de poder entrar, mas os dados comerciais continuam íntegros
  // para não apagar clientes, unidades, faturas ou histórico da usina.
  await desativarUsuario(usuarioId);
  await invalidarSessoesUsuario(usuarioId);

  return { message: "Conta desativada com sucesso." };
}

type ArquivoDeCadastro = {
  path: string;
  originalname?: string;
  mimetype?: string;
};

/**
 * O convite continua sendo obrigatório porque determina qual gerador será
 * responsável por analisar o cadastro. A conta nasce inativa e só é liberada
 * após e-mail confirmado e confirmação expressa do gerador.
 */
export async function cadastrarConsumidorComFatura(
  input: { convite?: unknown; cpf?: unknown; senha?: unknown },
  arquivo?: ArquivoDeCadastro,
) {
  const conviteToken = String(input.convite ?? "").trim();
  const cpfInformado = cpfLimpo(input.cpf);
  const senha = String(input.senha ?? "");
  if (!conviteToken) throw new Error("Informe o código do convite.");
  if (senha.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
  if (!arquivo?.path) throw new Error("Envie uma fatura CEMIG em PDF.");
  if (arquivo.mimetype && arquivo.mimetype !== "application/pdf") {
    throw new Error("Envie a fatura CEMIG no formato PDF.");
  }

  let usuarioCriadoId: string | null = null;
  let clienteCriadoId: string | null = null;
  let caminhoFatura: string | null = null;

  try {
    const convite = await aceitarConvite(conviteToken);
    const cpf = cpfLimpo(convite.cpf);
    if (cpf.length !== 11) {
      throw new Error("O convite não possui um CPF válido. Peça ao gerador para emitir um novo convite.");
    }
    // Mantém a conferência para versões antigas do app, mas a versão atual não
    // pede novamente nome nem CPF: os dados seguros vêm do próprio convite.
    if (cpfInformado && cpfInformado !== cpf) {
      throw new Error("O CPF informado precisa ser o mesmo CPF usado no convite.");
    }

    // PDFs CEMIG protegidos usam os quatro primeiros dígitos do CPF. A mesma
    // leitura funciona normalmente quando o PDF não possui senha.
    const texto = await extrairTextoPDF(arquivo.path, cpf.slice(0, 4));
    if (!/\bCEMIG\b/i.test(texto)) {
      throw new Error("Envie uma fatura emitida pela CEMIG.");
    }
    const dadosBrutos = interpretarFatura(texto) as Record<string, any>;
    const dadosFatura = dadosDeCadastroDaFatura(dadosBrutos);
    if (!dadosFatura.uc) {
      throw new Error("Não foi possível identificar a unidade consumidora na fatura CEMIG.");
    }
    if (!dadosFatura.titular) {
      throw new Error("Não foi possível identificar o titular da fatura CEMIG.");
    }
    if (!nomesCompativeis(convite.nome, dadosFatura.titular)) {
      throw new Error("A fatura enviada precisa estar no nome do titular informado no convite.");
    }
    if (!cpfDaFaturaConfere(cpf, dadosBrutos)) {
      throw new Error("Os dígitos do CPF exibidos na fatura não correspondem ao CPF informado.");
    }

    const empresaId = String(convite.empresa_id ?? "");
    if (!empresaId) throw new Error("Não foi possível identificar a empresa responsável pelo convite.");

    let clienteId = String(convite.cliente_id ?? "");
    let clienteExistente: any = null;
    if (clienteId) {
      const { data, error } = await supabase
        .from("clientes")
        .select("id,cpf,status,endereco")
        .eq("id", clienteId)
        .eq("empresa_id", empresaId)
        .maybeSingle();
      if (error) throw error;
      clienteExistente = data;
      if (!clienteExistente) throw new Error("O cliente vinculado ao convite não foi encontrado.");
    } else {
      const { data, error } = await supabase
        .from("clientes")
        .select("id,cpf,status,endereco")
        .eq("empresa_id", empresaId)
        .eq("cpf", cpf)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      clienteExistente = data;
      clienteId = String(data?.id ?? "");
    }
    if (clienteExistente?.cpf && cpfLimpo(clienteExistente.cpf) !== cpf) {
      throw new Error("O CPF da fatura não corresponde ao cliente deste convite.");
    }

    const { data: unidadeExistente, error: unidadeError } = await supabase
      .from("unidades_consumidoras")
      .select("id,cliente_id")
      .eq("numero", dadosFatura.uc)
      .eq("empresa_id", empresaId)
      .maybeSingle();
    if (unidadeError) throw unidadeError;
    if (unidadeExistente?.cliente_id && clienteId && unidadeExistente.cliente_id !== clienteId) {
      throw new Error("A unidade consumidora informada já está vinculada a outro cliente.");
    }

    if (!clienteId) {
      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          nome: convite.nome,
          cpf,
          email: emailNormalizado(convite.email),
          telefone: convite.telefone || null,
          whatsapp: convite.telefone || null,
          // O endereço é conferido na conta de energia enviada pelo próprio
          // consumidor; ele não é mais solicitado no convite.
          endereco: dadosFatura.endereco || null,
          usina_id: convite.usina_id ?? null,
          // O andamento do onboarding fica em solicitacoes_cadastro_clientes.
          // clientes aceita apenas os estados comerciais ATIVO/INATIVO.
          status: "ATIVO",
          empresa_id: empresaId,
        })
        .select("id")
        .single();
      if (clienteError) throw clienteError;
      clienteId = cliente.id;
      clienteCriadoId = cliente.id;
    }

    const usuario = await criarConta({
      nome: dadosFatura.titular,
      cpf,
      email: emailNormalizado(convite.email),
      senha,
      tipo: "CONSUMIDOR",
      convite: conviteToken,
      empresa_id: empresaId,
      ativo: true,
    });
    usuarioCriadoId = String(usuario.id);
    await vincularUsuarioAoClientePendente(usuarioCriadoId, clienteId, empresaId);

    caminhoFatura = await guardarFaturaDeCadastro(arquivo.path);
    const tokenVerificacao = gerarToken();
    await criarSolicitacaoCadastroCliente({
      conviteId: convite.id,
      usuarioId: usuarioCriadoId,
      clienteId,
      empresaId,
      gestorId: convite.gestor_id ?? null,
      cpf,
      faturaCemigUrl: caminhoFatura,
      dadosFatura,
      emailVerificacaoTokenHash: hashToken(tokenVerificacao),
      emailVerificacaoExpiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "ATIVO",
      emailVerificadoEm: new Date().toISOString(),
    });

    const { data: conviteAtualizado, error: conviteError } = await supabase
      .from("convites_clientes")
      .update({ cliente_id: clienteId, status: "ACEITO", aceito_em: new Date().toISOString() })
      .eq("id", convite.id)
      .eq("status", "PENDENTE")
      .select("id")
      .maybeSingle();
    if (conviteError) throw conviteError;
    if (!conviteAtualizado) throw new Error("Este convite já foi utilizado.");

    // Nome, CPF, e-mail e telefone vêm do convite. A conta de luz é a fonte
    // do endereço e da comprovação da UC, mantendo o cadastro sem digitação
    // redundante para o consumidor.
    if (!clienteCriadoId) {
      const { error: atualizacaoClienteError } = await supabase
        .from("clientes")
        .update({
          nome: convite.nome,
          cpf,
          email: emailNormalizado(convite.email),
          telefone: convite.telefone || null,
          whatsapp: convite.telefone || null,
          endereco: dadosFatura.endereco || clienteExistente?.endereco || null,
          status: "ATIVO",
        })
        .eq("id", clienteId)
        .eq("empresa_id", empresaId);
      if (atualizacaoClienteError) throw atualizacaoClienteError;
    }

    return {
      message: "Conta criada e ativada. A fatura CEMIG foi anexada ao seu cadastro.",
      status: "ATIVO",
      emailEnviado: false,
    };
  } catch (erro) {
    if (caminhoFatura) await supabase.storage.from("faturas").remove([caminhoFatura]).catch(() => undefined);
    if (usuarioCriadoId) await supabase.from("usuarios").delete().eq("id", usuarioCriadoId);
    if (clienteCriadoId) await supabase.from("clientes").delete().eq("id", clienteCriadoId);
    throw erro;
  } finally {
    await apagarArquivoTemporario(arquivo?.path);
  }
}

export async function verificarEmailDeCadastro(tokenInformado: unknown) {
  const token = String(tokenInformado ?? "").trim();
  if (!token) throw new Error("Link de confirmação inválido.");

  const solicitacao = await buscarSolicitacaoPorTokenVerificacao(hashToken(token));
  if (!solicitacao) throw new Error("Link de confirmação inválido ou expirado.");
  if (solicitacao.status === "ATIVO") {
    return { status: "ATIVO", message: "Este cadastro já foi aprovado pelo gerador." };
  }
  if (solicitacao.status === "AGUARDANDO_CONFIRMACAO_GERADOR") {
    return { status: solicitacao.status, message: "E-mail já confirmado. O cadastro aguarda a aprovação do gerador." };
  }
  if (solicitacao.status !== "AGUARDANDO_VERIFICACAO_EMAIL") {
    throw new Error("Este link de confirmação não pode mais ser utilizado.");
  }
  if (new Date(solicitacao.email_verificacao_expira_em).getTime() <= Date.now()) {
    throw new Error("Este link expirou. Solicite um novo e-mail de confirmação.");
  }

  const agora = new Date().toISOString();
  const atualizada = await atualizarSolicitacaoCadastroCliente(solicitacao.id, {
    status: "AGUARDANDO_CONFIRMACAO_GERADOR",
    email_verificado_em: agora,
  });

  const { data: cliente, error: clienteError } = await supabase
    .from("clientes")
    .select("id,nome,status")
    .eq("id", solicitacao.cliente_id)
    .maybeSingle();
  if (clienteError) throw clienteError;
  if (["AGUARDANDO_VERIFICACAO_EMAIL", "AGUARDANDO_CONFIRMACAO_GERADOR"].includes(String(cliente?.status ?? ""))) {
    const { error } = await supabase
      .from("clientes")
      .update({ status: "AGUARDANDO_CONFIRMACAO_GERADOR" })
      .eq("id", solicitacao.cliente_id);
    if (error) throw error;
  }

  let geradorNotificado = false;
  if (atualizada.gestor_id) {
    const { data: gestor, error: gestorError } = await supabase
      .from("usuarios")
      .select("nome,email")
      .eq("id", atualizada.gestor_id)
      .maybeSingle();
    if (gestorError) throw gestorError;
    if (gestor?.email) {
      geradorNotificado = await enviarEmailTransacional({
        destinatario: gestor.email,
        assunto: "Novo cadastro aguardando confirmação — Andrade Energy",
        html: `<div style="font-family:Arial,sans-serif;color:#252925;line-height:1.6"><h2 style="color:#39804a">Cadastro pronto para sua conferência</h2><p>Olá, <strong>${escaparHtml(gestor.nome)}</strong>.</p><p><strong>${escaparHtml(cliente?.nome ?? "Um consumidor")}</strong> confirmou o e-mail e enviou uma fatura CEMIG. Abra o aplicativo Gerador para conferir a solicitação e liberar o acesso.</p></div>`,
      }).catch(() => false);
    }
  }

  return {
    status: "AGUARDANDO_CONFIRMACAO_GERADOR",
    message: "E-mail confirmado. Agora o gerador conferirá os dados e liberará o seu acesso.",
    geradorNotificado,
  };
}

export async function reenviarVerificacaoDeCadastro(emailInformado: unknown) {
  const email = emailNormalizado(emailInformado);
  const respostaPadrao = { message: "Se houver um cadastro pendente para este e-mail, enviaremos uma nova confirmação.", emailEnviado: false };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respostaPadrao;

  const usuario = await buscarUsuarioConsumidorPorEmail(email);
  if (!usuario || usuario.ativo) return respostaPadrao;
  const solicitacao = await buscarSolicitacaoPorUsuario(usuario.id);
  if (!solicitacao || solicitacao.status !== "AGUARDANDO_VERIFICACAO_EMAIL") return respostaPadrao;

  const token = gerarToken();
  await atualizarSolicitacaoCadastroCliente(solicitacao.id, {
    email_verificacao_token_hash: hashToken(token),
    email_verificacao_expira_em: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
  const emailEnviado = await enviarEmailDeVerificacaoCadastro({ nome: usuario.nome, email, token }).catch(() => false);
  return { ...respostaPadrao, emailEnviado };
}

export async function cadastrarConta(input: { nome: string; cpf: string; email: string; senha: string; tipo: "CONSUMIDOR" | "GERADOR"; convite?: string; empresa_id?: string }) {
  if (input.tipo === "CONSUMIDOR") {
    throw new Error("Para criar uma conta de consumidor, envie a fatura CEMIG pela tela de cadastro atualizada.");
  }
  const convite = await aceitarConviteGerador(String(input.convite ?? ""));
  input = { ...input, nome: convite.nome, cpf: convite.cpf, email: convite.email, empresa_id: convite.empresa_id };
  if (!input.nome?.trim()) throw new Error("Informe seu nome.");
  if (String(input.cpf ?? "").replace(/\D/g, "").length !== 11) throw new Error("Informe um CPF válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email?.trim() ?? "")) throw new Error("Informe um e-mail válido.");
  if ((input.senha?.length ?? 0) < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
  const usuario = await criarConta(input);
  await concluirConviteGerador(convite, usuario.id);
  let emailEnviado = false;
  try {
    emailEnviado = await enviarEmailTransacional({
      destinatario: input.email.trim().toLowerCase(),
      assunto: "Confirmação de cadastro — Andrade Energy",
      html: `<div style="font-family:Arial,sans-serif;color:#252925;line-height:1.6"><h2 style="color:#39804a">Sua conta foi criada</h2><p>Olá, <strong>${input.nome.trim()}</strong>.</p><p>Seu cadastro na Andrade Energy foi concluído e o acesso já está disponível.</p><p>Use seu e-mail e a senha cadastrada para entrar no aplicativo.</p><p style="color:#6b706b;font-size:13px">Se você não realizou este cadastro, entre em contato com a Andrade Energy.</p></div>`,
    });
  } catch {
    emailEnviado = false;
  }
  return { message: "Conta criada com sucesso.", emailEnviado };
}

export async function iniciarTesteGerador(input: { nome: string; cpf: string; email: string; senha: string; telefone?: string }) {
  const cpf = cpfLimpo(input?.cpf);
  if (cpf.length !== 11) throw new Error("Informe um CPF válido para iniciar o teste.");

  const { data: usuarios, error: usuariosError } = await supabase
    .from("usuarios")
    .select("id,cpf,perfil,ativo");
  if (usuariosError) throw usuariosError;
  const idsMesmoCpf = (usuarios ?? [])
    .filter((item: any) => ["GESTOR", "ADMIN"].includes(item.perfil) && cpfLimpo(item.cpf) === cpf)
    .map((item: any) => item.id);
  if (idsMesmoCpf.length) {
    const { data: testes, error: testesError } = await supabase
      .from("assinaturas_geradores")
      .select("id")
      .in("gerador_id", idsMesmoCpf)
      .not("fim_teste_em", "is", null)
      .limit(1);
    if (testesError) throw testesError;
    if (testes?.length) throw new Error("Este CPF já utilizou o teste gratuito. Entre na conta existente para escolher um plano.");
    throw new Error("Este CPF já possui uma conta de Gerador. Entre com seu e-mail e senha para continuar.");
  }

  const { data: plano, error: planoError } = await supabase
    .from("planos_geradores")
    .select("*")
    .eq("ativo", true)
    .order("valor_mensal", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (planoError) throw planoError;
  if (!plano) throw new Error("Nenhum plano está disponível para o teste neste momento.");

  const cadastro = { ...input, cpf, tipo: "GERADOR" as const };
  const conta = await cadastrarConta(cadastro);
  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("*")
    .eq("cpf", cpf)
    .eq("perfil", "GESTOR")
    .eq("email", emailNormalizado(input.email))
    .single();
  if (usuarioError || !usuario) throw usuarioError ?? new Error("Conta de teste não encontrada após o cadastro.");

  if (input.telefone) {
    const telefone = telefoneNormalizado(input.telefone);
    const { error } = await supabase.from("usuarios").update({ telefone }).eq("id", usuario.id);
    if (error) throw error;
    usuario.telefone = telefone;
  }

  const assinatura = await contratarPlano({
    geradorId: usuario.id,
    planoId: plano.id,
    ciclo: "MENSAL",
    formaPagamento: "UNDEFINED",
    diasTeste: 45,
    inicioEm: new Date().toISOString().slice(0, 10),
    observacoes: "Teste gratuito iniciado pelo cadastro público do portal.",
  }, usuario.id);
  const sessao = await autenticar(emailNormalizado(input.email), String(input.senha), "GERADOR");

  return {
    ...sessao,
    message: conta.message,
    emailEnviado: conta.emailEnviado,
    assinatura,
    downloadUrl: String(process.env.APP_GERADOR_DOWNLOAD_URL ?? "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-gerador.apk"),
  };
}

export {
  buscarUsuario,
  listarUsuarios
};

