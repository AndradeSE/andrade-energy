import { supabase } from "../../config/supabase";
import { appScheme } from "../../utils/appScheme";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import { gerarToken, hashToken } from "../../utils/token";
import { EMPRESA_ANDRADE_ID } from "../../config/empresa";
import { nomePessoaValido } from "../clientes/validacaoCadastro";
import { opcoesPromocaoAdministrador, validarPromocaoAdministrador } from "./promocaoAdministrador.policy";
import { PERMISSOES_COMERCIAL, normalizarPermissoesComerciais } from "../comercial/permissoesComerciais";
export { PERMISSOES_COMERCIAL } from "../comercial/permissoesComerciais";

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const cpfLimpo = (cpf: unknown) => String(cpf ?? "").replace(/\D/g, "");
const escapar = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]!));

export const PERMISSOES_GERADOR = { usinas: true, clientes: true, unidades: true, contratos: true, faturas: true, operacao: true };

export function papeisDaEquipePermitidos(usuario: any): string[] {
  const titular = ["ADMIN_EMPRESA", "GESTOR"].includes(String(usuario?.papel_empresa ?? ""));
  if (!titular || !usuario?.empresa_id || !["ADMIN", "GESTOR"].includes(String(usuario?.perfil ?? ""))) return [];
  const papeis = ["COLABORADOR_GERADOR"];
  if (usuario.perfil === "ADMIN" && usuario.empresa_id === EMPRESA_ANDRADE_ID) papeis.push("COLABORADOR_COMERCIAL");
  return papeis;
}

function papelPermitido(usuario: any, papel: string) {
  return papeisDaEquipePermitidos(usuario).includes(papel);
}

function permissoesSeguras(papel: string, entrada: any) {
  if (papel === "COLABORADOR_COMERCIAL") return normalizarPermissoesComerciais(entrada);
  const permitidas = papel === "COLABORADOR_COMERCIAL" ? PERMISSOES_COMERCIAL : PERMISSOES_GERADOR;
  return Object.fromEntries(Object.keys(permitidas).map((chave) => [chave, entrada?.[chave] !== false]));
}

async function enviarConvite(convite: any, token: string) {
  const link = `${appScheme("gerador")}://criar-conta?convite=${token}`;
  return enviarEmailTransacional({
    empresaId: convite.empresa_id,
    destinatario: convite.email,
    assunto: "Convite de colaborador — Andrade Energy",
    html: `<div style="max-width:560px;margin:auto;padding:28px;font-family:Arial,sans-serif;color:#252925;line-height:1.6;background:#f7f8f7;border-radius:14px"><h2 style="color:#39804a">Acesso de colaborador</h2><p>Olá, <strong>${escapar(convite.nome)}</strong>.</p><p>Você recebeu acesso operacional à Andrade Energy. Sua conta não terá acesso a carteira, recebíveis ou transferências.</p><p style="margin:26px 0"><a href="${link}" style="display:inline-block;padding:14px 22px;background:#39804a;color:#fff;font-weight:700;text-decoration:none;border-radius:8px">Aceitar convite e criar senha</a></p><p>Se o botão não abrir, informe este código no aplicativo:</p><div style="padding:14px;border:2px dashed #39804a;border-radius:10px;background:#fff;font-family:monospace;font-weight:700;word-break:break-all">${token}</div><p style="font-size:13px;color:#6b706b">O convite é válido por 7 dias.</p></div>`,
  });
}

export async function listarColaboradores(usuario: any) {
  if (!papeisDaEquipePermitidos(usuario).length) throw new Error("A gestão da equipe é exclusiva do titular.");
  const empresaId = String(usuario.empresa_id);
  const papeisDaEmpresa = papeisDaEquipePermitidos(usuario);
  const [{ data: vinculos, error }, { data: convites, error: conviteError }] = await Promise.all([
    supabase.from("empresa_usuarios").select("id,papel,permissoes,ativo,criado_em,atualizado_em,ultimo_acesso_em,usuarios!empresa_usuarios_usuario_id_fkey(id,nome,email,telefone)").eq("empresa_id", empresaId).in("papel", papeisDaEmpresa).order("criado_em", { ascending: false }),
    supabase.from("convites_colaboradores").select("id,nome,email,telefone,papel,permissoes,status,expira_em,criado_em").eq("empresa_id", empresaId).in("papel", papeisDaEmpresa).order("criado_em", { ascending: false }),
  ]);
  if (error) throw error;
  if (conviteError) throw conviteError;
  let administradores: any[] = [];
  if (opcoesPromocaoAdministrador(usuario).length) {
    const { data: historico, error: erroHistorico } = await supabase.from("auditoria_seguranca").select("recurso_id")
      .eq("empresa_id", empresaId).eq("acao", "COLABORADOR_PROMOVIDO_ADMIN");
    if (erroHistorico) throw erroHistorico;
    const ids = [...new Set((historico ?? []).map((item: any) => item.recurso_id))];
    if (ids.length) {
      const { data, error: erroAdmins } = await supabase.from("empresa_usuarios")
        .select("id,papel,ativo,usuario_id,usuarios!empresa_usuarios_usuario_id_fkey(id,nome,email)")
        .eq("empresa_id", empresaId).eq("papel", "ADMIN_EMPRESA").eq("ativo", true).eq("principal", false).in("id", ids);
      if (erroAdmins) throw erroAdmins;
      administradores = (data ?? []).map((item: any) => ({ ...item, podeRevogar: item.usuario_id !== usuario.id }));
    }
  }
  return { colaboradores: vinculos ?? [], administradores, convites: (convites ?? []).filter((item: any) => item.status === "PENDENTE"), promocoesPermitidas: opcoesPromocaoAdministrador(usuario) };
}

export async function revogarAdministradorColaborador(id: string, input: any, usuario: any) {
  if (!opcoesPromocaoAdministrador(usuario).length || input?.confirmacao !== "REVOGAR_ADMINISTRADOR") {
    throw new Error("Confirme a remoção do acesso de administrador.");
  }
  const { data, error } = await supabase.rpc("revogar_administrador_colaborador", {
    p_ator: usuario.id, p_empresa: usuario.empresa_id, p_vinculo: id,
  });
  if (error) throw error;
  return data;
}

export async function promoverColaboradorAdministrador(id: string, input: any, usuario: any) {
  if (input?.confirmacao !== "PROMOVER_ADMINISTRADOR") throw new Error("Confirme o novo acesso administrativo antes de continuar.");
  const { data: alvo, error } = await supabase.from("empresa_usuarios").select("id,empresa_id,usuario_id,papel,ativo")
    .eq("id", id).eq("empresa_id", usuario.empresa_id).maybeSingle();
  if (error) throw error;
  validarPromocaoAdministrador(usuario, alvo, input?.escopo);
  const { data, error: erroPromocao } = await supabase.rpc("promover_colaborador_administrador", {
    p_ator: usuario.id, p_empresa: usuario.empresa_id, p_vinculo: id, p_escopo: input.escopo,
  });
  if (erroPromocao) {
    if (erroPromocao.code === "PGRST202") throw new Error("A promoção administrativa ainda não foi habilitada neste ambiente.");
    throw erroPromocao;
  }
  return { ...data, message: "Acesso administrativo concedido. A pessoa precisa entrar novamente no aplicativo." };
}

export async function listarAuditoriaColaboradores(usuario: any) {
  const empresaId = String(usuario?.empresa_id ?? "");
  if (!empresaId) throw new Error("Empresa ativa não identificada.");
  const papel = String(usuario?.papel_empresa ?? "");
  if (!papel.startsWith("COLABORADOR_") && !["ADMIN", "GESTOR"].includes(String(usuario?.perfil ?? ""))) {
    throw new Error("Acesso ao histórico não autorizado.");
  }
  const { data, error } = await supabase
    .from("auditoria_seguranca")
    .select("id,acao,recurso,recurso_id,detalhes,criado_em,usuarios!auditoria_seguranca_usuario_id_fkey(id,nome,email)")
    .eq("empresa_id", empresaId)
    .like("acao", "COLABORADOR_%")
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function criarConviteColaborador(input: any, usuario: any) {
  const papel = String(input?.papel ?? "COLABORADOR_GERADOR").toUpperCase();
  if (!papelPermitido(usuario, papel)) throw new Error("Você não pode convidar colaboradores para esta área.");
  const nome = String(input?.nome ?? "").trim();
  const cpf = cpfLimpo(input?.cpf);
  const email = String(input?.email ?? "").trim().toLowerCase();
  const telefone = String(input?.telefone ?? "").replace(/\D/g, "") || null;
  if (!nomePessoaValido(nome)) throw new Error("Informe nome e sobrenome do colaborador.");
  if (cpf.length !== 11) throw new Error("Informe um CPF válido.");
  if (!emailValido(email)) throw new Error("Informe um e-mail válido.");
  const empresaId = String(usuario.empresa_id);
  // Uma pessoa pode usar o mesmo e-mail como consumidora e como geradora.
  // O convite de colaborador pertence ao login do app Gerador; por isso um
  // vínculo LEITURA do app Consumidor não significa que ela já esteja na equipe.
  const { data: usuariosDoEmail, error: usuariosError } = await supabase.from("usuarios").select("id,perfil").eq("email", email).in("perfil", ["GESTOR", "ADMIN"]);
  if (usuariosError) throw usuariosError;
  const idsDoEmail = (usuariosDoEmail ?? []).map((item: any) => item.id);
  if (idsDoEmail.length) {
    const { data: vinculoExistente, error: vinculoError } = await supabase.from("empresa_usuarios").select("id,papel").eq("empresa_id", empresaId).in("usuario_id", idsDoEmail).limit(1).maybeSingle();
    if (vinculoError) throw vinculoError;
    if (vinculoExistente) throw new Error(String(vinculoExistente.papel).startsWith("COLABORADOR_")
      ? "Este e-mail já faz parte da equipe. Gerencie as permissões na lista abaixo."
      : "Este login já possui acesso de titular a esta empresa e não precisa de um convite de colaborador.");
  }
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
  if (!papeisDaEquipePermitidos(usuario).length) throw new Error("A gestão da equipe é exclusiva do titular.");
  const { data: existente, error: consultaError } = await supabase.from("convites_colaboradores").select("id,status,papel").eq("id", id).eq("empresa_id", usuario.empresa_id).maybeSingle();
  if (consultaError) throw consultaError;
  if (!existente || !papelPermitido(usuario, existente.papel)) throw new Error("Convite não encontrado.");
  if (existente.status === "CANCELADO") return { message: "Convite já estava cancelado." };
  if (existente.status !== "PENDENTE") throw new Error("Este convite não está mais pendente.");
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
  const { error: vinculoError } = await supabase.from("empresa_usuarios").upsert({ empresa_id: convite.empresa_id, usuario_id: usuarioId, papel: convite.papel, permissoes: convite.permissoes, convidado_por: convite.convidado_por, principal: false, ativo: true, atualizado_em: new Date().toISOString() }, { onConflict: "empresa_id,usuario_id" });
  if (vinculoError) throw vinculoError;
  const { error } = await supabase.from("convites_colaboradores").update({ status: "ACEITO", aceito_em: new Date().toISOString(), usuario_id: usuarioId, atualizado_em: new Date().toISOString() }).eq("id", convite.id).eq("status", "PENDENTE");
  if (error) throw error;
}
