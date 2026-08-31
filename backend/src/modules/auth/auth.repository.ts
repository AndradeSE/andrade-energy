import { supabase } from "../../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../../config/empresa";

export async function login(email: string, senha: string, tipo?: "CONSUMIDOR" | "GERADOR") {
  let consulta = supabase
    .from("usuarios")
    .select("*")
    .eq("email", email)
    .eq("senha", senha)
    .eq("ativo", true);

  consulta = tipo === "CONSUMIDOR"
    // O proprietário também pode consultar as próprias UCs pelo app Consumidor.
    ? consulta.in("perfil", ["LEITURA", "GESTOR", "ADMIN"])
    : tipo === "GERADOR"
      ? consulta.in("perfil", ["GESTOR", "ADMIN"])
      : consulta;

  const { data, error } = await consulta.limit(1).maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

export async function buscarUsuario(id: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listarUsuarios() {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .order("nome");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function vincularClientePorCpf(usuario: any) {
  const cpf = String(usuario?.cpf ?? "").replace(/\D/g, "");
  if (cpf.length !== 11) return usuario?.cliente_id ?? null;

  const prefixoCpf = cpf.slice(0, 9);
  const { data: candidatos, error: clienteError } = await supabase
    .from("clientes")
    .select("id,cpf")
    .like("cpf", `${prefixoCpf}%`);

  if (clienteError) throw clienteError;
  const cpfsEncontrados = new Set((candidatos ?? []).map((item) => String(item.cpf ?? "").replace(/\D/g, "")));
  const cliente = cpfsEncontrados.size === 1 ? candidatos?.[0] : null;
  if (!cliente) return null;

  if (usuario.cliente_id !== cliente.id) {
    const { error } = await supabase
      .from("usuarios")
      .update({ cliente_id: cliente.id, cpf })
      .eq("id", usuario.id);
    if (error) throw error;
  }

  return cliente.id;
}

export async function criarConta(input: {
  nome: string;
  cpf: string;
  email: string;
  senha: string;
  tipo: "CONSUMIDOR" | "GERADOR";
  convite?: string;
  empresa_id?: string;
  ativo?: boolean;
}) {
  const cpf = input.cpf.replace(/\D/g, "");
  const email = input.email.trim().toLowerCase();
  const empresaId = input.empresa_id ?? EMPRESA_ANDRADE_ID;
  const perfil = input.tipo === "GERADOR"
    ? (String(input.convite ?? "").startsWith("admin_") ? "ADMIN" : "GESTOR")
    : "LEITURA";
  const ativo = input.ativo !== false;
  const { data: emailNoMesmoPerfil } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .eq("empresa_id", empresaId)
    .eq("perfil", perfil)
    .limit(1);
  if (emailNoMesmoPerfil?.length) throw new Error("Já existe uma conta deste perfil com este e-mail.");

  const { data: cpfNoMesmoPerfil } = await supabase
    .from("usuarios")
    .select("id")
    .eq("cpf", cpf)
    .eq("empresa_id", empresaId)
    .eq("perfil", perfil)
    .limit(1);
  if (cpfNoMesmoPerfil?.length) throw new Error("Já existe uma conta deste perfil com este CPF.");

  const { data, error } = await supabase
    .from("usuarios")
    .insert({ nome: input.nome.trim(), cpf, email, senha: input.senha, perfil, ativo, empresa_id: empresaId })
    .select("*")
    .single();
  if (error) throw error;
  const papel = perfil === "ADMIN" ? "ADMIN_EMPRESA" : perfil === "GESTOR" ? "GESTOR" : "LEITURA";
  const { error: vinculoError } = await supabase.from("empresa_usuarios").upsert({
    empresa_id: empresaId,
    usuario_id: data.id,
    papel,
    principal: true,
    ativo,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "empresa_id,usuario_id" });
  if (vinculoError) throw vinculoError;
  return data;
}

export async function buscarUsuarioPorCredenciais(
  email: string,
  senha: string,
  tipo?: "CONSUMIDOR" | "GERADOR",
) {
  let consulta = supabase
    .from("usuarios")
    .select("*")
    .eq("email", email)
    .eq("senha", senha);

  consulta = tipo === "CONSUMIDOR"
    ? consulta.in("perfil", ["LEITURA", "GESTOR", "ADMIN"])
    : tipo === "GERADOR"
      ? consulta.in("perfil", ["GESTOR", "ADMIN"])
      : consulta;

  const { data, error } = await consulta.limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function buscarUsuarioConsumidorPorEmail(email: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id,nome,email,cliente_id,empresa_id,ativo")
    .eq("email", email)
    .eq("perfil", "LEITURA")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function vincularUsuarioAoClientePendente(usuarioId: string, clienteId: string, empresaId: string) {
  const { error } = await supabase
    .from("usuarios")
    .update({ cliente_id: clienteId, empresa_id: empresaId, ativo: false })
    .eq("id", usuarioId);
  if (error) throw error;
}

export async function criarSolicitacaoCadastroCliente(input: {
  conviteId: string;
  usuarioId: string;
  clienteId: string;
  empresaId: string;
  gestorId?: string | null;
  cpf: string;
  faturaCemigUrl: string;
  dadosFatura: Record<string, unknown>;
  emailVerificacaoTokenHash: string;
  emailVerificacaoExpiraEm: string;
}) {
  const { data, error } = await supabase
    .from("solicitacoes_cadastro_clientes")
    .insert({
      convite_id: input.conviteId,
      usuario_id: input.usuarioId,
      cliente_id: input.clienteId,
      empresa_id: input.empresaId,
      gestor_id: input.gestorId ?? null,
      cpf: input.cpf,
      fatura_cemig_url: input.faturaCemigUrl,
      dados_fatura: input.dadosFatura,
      email_verificacao_token_hash: input.emailVerificacaoTokenHash,
      email_verificacao_expira_em: input.emailVerificacaoExpiraEm,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function buscarSolicitacaoPorTokenVerificacao(tokenHash: string) {
  const { data, error } = await supabase
    .from("solicitacoes_cadastro_clientes")
    .select("*")
    .eq("email_verificacao_token_hash", tokenHash)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function buscarSolicitacaoPorUsuario(usuarioId: string) {
  const { data, error } = await supabase
    .from("solicitacoes_cadastro_clientes")
    .select("*")
    .eq("usuario_id", usuarioId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function atualizarSolicitacaoCadastroCliente(id: string, dados: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("solicitacoes_cadastro_clientes")
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarPerfilUsuario(
  id: string,
  dados: { nome: string; email: string; telefone: string | null },
) {
  const { data, error } = await supabase
    .from("usuarios")
    .update(dados)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return data;
}

export async function desativarUsuario(id: string) {
  const { error } = await supabase
    .from("usuarios")
    .update({ ativo: false })
    .eq("id", id);

  if (error) throw error;
}

export async function invalidarSessoesUsuario(id: string) {
  const { error } = await supabase
    .from("sessoes_usuarios")
    .delete()
    .eq("usuario_id", id);

  if (error) throw error;
}
