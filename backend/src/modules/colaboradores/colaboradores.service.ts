import { supabase } from "../../config/supabase";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import { gerarToken, hashToken } from "../../utils/token";

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const cpfLimpo = (cpf: unknown) => String(cpf ?? "").replace(/\D/g, "");
const escapar = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]!));

export const PERMISSOES_GERADOR = { usinas: true, clientes: true, unidades: true, contratos: true, faturas: true, operacao: true };
export const PERMISSOES_COMERCIAL = { geradores: true, monitoramento: true, documentos: true };

function papelPermitido(usuario: any, papel: string) {
  const atual = String(usuario?.papel_empresa ?? "");
  if (atual.startsWith("COLABORADOR_")) return false;
  if (papel === "COLABORADOR_COMERCIAL") return usuario?.perfil === "ADMIN";
  return ["ADMIN", "GESTOR"].includes(String(usuario?.perfil ?? ""));
}

function permissoesSeguras(papel: string, entrada: any) {
  const permitidas = papel === "COLABORADOR_COMERCIAL" ? PERMISSOES_COMERCIAL : PERMISSOES_GERADOR;
  return Object.fromEntries(Object.keys(permitidas).map((chave) => [chave, entrada?.[chave] !== false]));
}

async function enviarConvite(convite: any, token: string) {
  const link = `andradeenergygerador://criar-conta?convite=${token}`;
  return enviarEmailTransacional({
    empresaId: convite.empresa_id,
    destinatario: convite.email,
    assunto: "Convite de colaborador — Andrade Energy",
    html: `<div style="max-width:560px;margin:auto;padding:28px;font-family:Arial,sans-serif;color:#252925;line-height:1.6;background:#f7f8f7;border-radius:14px"><h2 style="color:#39804a">Acesso de colaborador</h2><p>Olá, <strong>${escapar(convite.nome)}</strong>.</p><p>Você recebeu acesso operacional à Andrade Energy. Sua conta não terá acesso a carteira, recebíveis ou transferências.</p><p style="margin:26px 0"><a href="${link}" style="display:inline-block;padding:14px 22px;background:#39804a;color:#fff;font-weight:700;text-decoration:none;border-radius:8px">Aceitar convite e criar senha</a></p><p>Se o botão não abrir, informe este código no aplicativo:</p><div style="padding:14px;border:2px dashed #39804a;border-radius:10px;background:#fff;font-family:monospace;font-weight:700;word-break:break-all">${token}</div><p style="font-size:13px;color:#6b706b">O convite é válido por 7 dias.</p></div>`,
  });
}

export async function listarColaboradores(usuario: any) {
  if (String(usuario?.papel_empresa ?? "").startsWith("COLABORADOR_")) throw new Error("A gestão da equipe é exclusiva do titular.");
  const empresaId = String(usuario.empresa_id);
  const [{ data: vinculos, error }, { data: convites, error: conviteError }] = await Promise.all([
    supabase.from("empresa_usuarios").select("id,papel,permissoes,ativo,criado_em,atualizado_em,ultimo_acesso_em,usuarios!empresa_usuarios_usuario_id_fkey(id,nome,email,telefone)").eq("empresa_id", empresaId).in("papel", ["COLABORADOR_GERADOR", "COLABORADOR_COMERCIAL"]).order("criado_em", { ascending: false }),
    supabase.from("convites_colaboradores").select("id,nome,email,telefone,papel,permissoes,status,expira_em,criado_em").eq("empresa_id", empresaId).order("criado_em", { ascending: false }),
  ]);
  if (error) throw error;
  if (conviteError) throw conviteError;
  return { colaboradores: vinculos ?? [], convites: (convites ?? []).filter((item: any) => item.status !== "ACEITO") };
}

export async function criarConviteColaborador(input: any, usuario: any) {
  const papel = String(input?.papel ?? "COLABORADOR_GERADOR").toUpperCase();
  if (!papelPermitido(usuario, papel)) throw new Error("Você não pode convidar colaboradores para esta área.");
  const nome = String(input?.nome ?? "").trim();
  const cpf = cpfLimpo(input?.cpf);
  const email = String(input?.email ?? "").trim().toLowerCase();
  const telefone = String(input?.telefone ?? "").replace(/\D/g, "") || null;
  if (!nome) throw new Error("Informe o nome do colaborador.");
  if (cpf.length !== 11) throw new Error("Informe um CPF válido.");
  if (!emailValido(email)) throw new Error("Informe um e-mail válido.");
  const empresaId = String(usuario.empresa_id);
  const { data: existente } = await supabase.from("usuarios").select("id").eq("empresa_id", empresaId).eq("email", email).limit(1).maybeSingle();
  if (existente) throw new Error("Este e-mail já possui acesso a esta empresa.");
  await supabase.from("convites_colaboradores").update({ status: "CANCELADO", atualizado_em: new Date().toISOString() }).eq("empresa_id", empresaId).eq("email", email).eq("status", "PENDENTE");
  const token = `colaborador_${gerarToken()}`;
  const permissoes = permissoesSeguras(papel, input?.permissoes);
  const { data, error } = await supabase.from("convites_colaboradores").insert({ empresa_id: empresaId, convidado_por: usuario.id, nome, cpf, email, telefone, papel, permissoes, token_hash: hashToken(token), expira_em: new Date(Date.now() + 7 * 86400000).toISOString() }).select("*").single();
  if (error) throw error;
  const emailEnviado = await enviarConvite(data, token).catch(() => false);
  return { convite: data, emailEnviado, token: emailEnviado ? undefined : token };
}

export async function reenviarConviteColaborador(id: string, usuario: any) {
  const { data } = await supabase.from("convites_colaboradores").select("*").eq("id", id).eq("empresa_id", usuario.empresa_id).maybeSingle();
  if (!data || !papelPermitido(usuario, data.papel)) throw new Error("Convite não encontrado.");
  if (data.status === "ACEITO") throw new Error("Este convite já foi aceito.");
  const token = `colaborador_${gerarToken()}`;
  const expiraEm = new Date(Date.now() + 7 * 86400000).toISOString();
  const { error } = await supabase.from("convites_colaboradores").update({ token_hash: hashToken(token), status: "PENDENTE", expira_em: expiraEm, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  const emailEnviado = await enviarConvite(data, token).catch(() => false);
  return { message: "Convite reenviado.", emailEnviado, token: emailEnviado ? undefined : token };
}

export async function atualizarColaborador(id: string, input: any, usuario: any) {
  const { data } = await supabase.from("empresa_usuarios").select("id,papel").eq("id", id).eq("empresa_id", usuario.empresa_id).maybeSingle();
  if (!data || !papelPermitido(usuario, data.papel)) throw new Error("Colaborador não encontrado.");
  const alteracoes: any = { atualizado_em: new Date().toISOString() };
  if (input?.ativo !== undefined) alteracoes.ativo = Boolean(input.ativo);
  if (input?.permissoes) alteracoes.permissoes = permissoesSeguras(data.papel, input.permissoes);
  const { data: atualizado, error } = await supabase.from("empresa_usuarios").update(alteracoes).eq("id", id).select("*").single();
  if (error) throw error;
  return atualizado;
}

export async function cancelarConviteColaborador(id: string, usuario: any) {
  if (String(usuario?.papel_empresa ?? "").startsWith("COLABORADOR_")) throw new Error("A gestão da equipe é exclusiva do titular.");
  const { data, error } = await supabase.from("convites_colaboradores").update({ status: "CANCELADO", atualizado_em: new Date().toISOString() }).eq("id", id).eq("empresa_id", usuario.empresa_id).eq("status", "PENDENTE").select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Convite pendente não encontrado.");
  return { message: "Convite cancelado." };
}

export async function consultarConviteColaborador(token: string) {
  if (!String(token).startsWith("colaborador_")) throw new Error("Convite inválido.");
  const { data, error } = await supabase.from("convites_colaboradores").select("*").eq("token_hash", hashToken(token)).maybeSingle();
  if (error || !data || data.status !== "PENDENTE" || new Date(data.expira_em) <= new Date()) throw new Error("Convite de colaborador inválido ou expirado.");
  return data;
}

export async function concluirConviteColaborador(convite: any, usuarioId: string) {
  const { error: vinculoError } = await supabase.from("empresa_usuarios").update({ papel: convite.papel, permissoes: convite.permissoes, convidado_por: convite.convidado_por, ativo: true, atualizado_em: new Date().toISOString() }).eq("empresa_id", convite.empresa_id).eq("usuario_id", usuarioId);
  if (vinculoError) throw vinculoError;
  const { error } = await supabase.from("convites_colaboradores").update({ status: "ACEITO", aceito_em: new Date().toISOString(), usuario_id: usuarioId, atualizado_em: new Date().toISOString() }).eq("id", convite.id).eq("status", "PENDENTE");
  if (error) throw error;
}
