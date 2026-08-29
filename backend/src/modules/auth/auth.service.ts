import {
  atualizarPerfilUsuario,
  buscarUsuario,
  criarConta,
  desativarUsuario,
  invalidarSessoesUsuario,
  listarUsuarios,
  login,
  vincularClientePorCpf,
} from "./auth.repository";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import { supabase } from "../../config/supabase";
import { gerarToken, hashToken } from "../../utils/token";
import { aceitarConvite, aceitarConviteGerador, concluirConvite, concluirConviteGerador } from "../convites/convites.service";
import { contratarPlano } from "../comercial/comercial.service";

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
  const usuario = await login(email, senha, tipo);

  if (!usuario) {
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

export async function cadastrarConta(input: { nome: string; cpf: string; email: string; senha: string; tipo: "CONSUMIDOR" | "GERADOR"; convite?: string; empresa_id?: string }) {
  const convite = input.tipo === "CONSUMIDOR"
    ? await aceitarConvite(String(input.convite ?? ""))
    : await aceitarConviteGerador(String(input.convite ?? ""));
  if (convite) input = { ...input, nome: convite.nome, cpf: convite.cpf, email: convite.email, empresa_id: convite.empresa_id };
  if (!input.nome?.trim()) throw new Error("Informe seu nome.");
  if (String(input.cpf ?? "").replace(/\D/g, "").length !== 11) throw new Error("Informe um CPF válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email?.trim() ?? "")) throw new Error("Informe um e-mail válido.");
  if ((input.senha?.length ?? 0) < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
  if (!(["CONSUMIDOR", "GERADOR"] as const).includes(input.tipo)) throw new Error("Escolha consumidor ou gerador.");
  const usuario = await criarConta(input);
  if (input.tipo === "CONSUMIDOR") await concluirConvite(convite, usuario.id);
  else await concluirConviteGerador(convite, usuario.id);
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

