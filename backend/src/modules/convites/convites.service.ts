import { supabase } from "../../config/supabase";
import { gerarToken, hashToken } from "../../utils/token";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import { obterMinutaParaConvite } from "../contratos/contratos.service";
import { empresaIdDoUsuario } from "../../config/empresa";

function cpfLimpo(valor: unknown) { return String(valor ?? "").replace(/\D/g, ""); }
function escaparHtml(valor: string) {
  return valor.replace(/[&<>"']/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[caractere] ?? caractere));
}

export async function criarConvite(input: any, gestor: any) {
  const empresaId = empresaIdDoUsuario(gestor);
  const cpf = cpfLimpo(input.cpf);
  const email = String(input.email ?? "").trim().toLowerCase();
  const nome = String(input.nome ?? "").trim();
  if (!nome) throw new Error("Informe o nome do consumidor.");
  if (cpf.length !== 11) throw new Error("Informe um CPF válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");

  const { data: clienteExistente } = await supabase.from("clientes").select("id").eq("empresa_id", empresaId).eq("cpf", cpf).limit(1).maybeSingle();
  const { data: contaEmail } = await supabase
    .from("usuarios")
    .select("id,cliente_id,perfil")
    .eq("email", email)
    .eq("empresa_id", empresaId)
    .eq("perfil", "LEITURA")
    .limit(1)
    .maybeSingle();
  if (contaEmail) {
    const contaConsumidorOrfa = contaEmail.perfil === "LEITURA" && !clienteExistente;
    if (!contaConsumidorOrfa) throw new Error("Este e-mail já possui uma conta de consumidor ativa.");
    const { error: erroLimpeza } = await supabase.from("usuarios").delete().eq("id", contaEmail.id);
    if (erroLimpeza) throw erroLimpeza;
  }

  const { data: contaConsumidorCpf } = await supabase
    .from("usuarios")
    .select("id")
    .eq("cpf", cpf)
    .eq("empresa_id", empresaId)
    .eq("perfil", "LEITURA")
    .limit(1)
    .maybeSingle();
  if (contaConsumidorCpf) {
    if (clienteExistente) throw new Error("Este CPF já possui uma conta de consumidor ativa.");
    const { error: erroLimpeza } = await supabase.from("usuarios").delete().eq("id", contaConsumidorCpf.id);
    if (erroLimpeza) throw erroLimpeza;
  }

  const token = gerarToken();
  const { error } = await supabase.from("convites_clientes").insert({
    gestor_id: gestor.id,
    empresa_id: empresaId,
    usina_id: gestor.usina_id ?? input.usina_id ?? null,
    cliente_id: clienteExistente?.id ?? null,
    nome, cpf, email,
    token_hash: hashToken(token),
    expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;

  const link = `andradeenergyconsumidor://criar-conta?convite=${token}`;
  let emailEnviado = false;
  let minutaAnexada = false;
  try {
    // O convite não pode deixar de ser enviado se a geração da minuta falhar.
    const minuta = clienteExistente?.id ? await obterMinutaParaConvite(clienteExistente.id).catch(() => null) : null;
    minutaAnexada = Boolean(minuta);
    emailEnviado = await enviarEmailTransacional({
      destinatario: email,
      assunto: "Convite para Andrade Energy Consumidor",
      html: `<div style="max-width:560px;margin:auto;padding:28px;font-family:Arial,sans-serif;color:#252925;line-height:1.6;background:#f7f8f7;border-radius:14px"><h2 style="margin-top:0;color:#39804a">Você recebeu um convite</h2><p>Olá, <strong>${escaparHtml(nome)}</strong>.</p><p>Seu gerador convidou você para acompanhar unidades, economia e faturas no Andrade Energy Consumidor.</p>${minuta ? "<p>A minuta do contrato da sua unidade segue anexada para leitura. Ela não substitui o contrato assinado.</p>" : ""}<p style="margin:26px 0"><a href="${link}" style="display:inline-block;padding:14px 22px;background:#39804a;color:#fff;font-weight:700;text-decoration:none;border-radius:8px">Aceitar convite e criar conta</a></p><p style="margin-bottom:8px;font-size:13px;color:#6b706b">Se o botão não abrir o aplicativo, copie o código abaixo:</p><div style="padding:16px 12px;border:2px dashed #39804a;border-radius:10px;background:#fff;color:#1f512e;font-family:monospace;font-size:20px;font-weight:700;letter-spacing:1px;text-align:center;word-break:break-all">${token}</div><p style="margin-top:18px;font-size:13px;color:#6b706b">Este convite é válido por 7 dias.</p></div>`,
      anexos: minuta ? [minuta] : [],
    });
  } catch {
    emailEnviado = false;
  }
  return { message: "Convite criado.", emailEnviado, minutaAnexada, token: emailEnviado ? undefined : token };
}

export async function consultarConvite(token: string) {
  const { data, error } = await supabase.from("convites_clientes")
    .select("id,nome,cpf,email,status,expira_em,empresa_id")
    .eq("token_hash", hashToken(token)).maybeSingle();
  if (error || !data || data.status !== "PENDENTE" || new Date(data.expira_em) <= new Date()) throw new Error("Convite inválido ou expirado.");
  return { nome: data.nome, cpf: data.cpf, email: data.email, empresa_id: data.empresa_id };
}

export async function aceitarConvite(token: string) {
  const convite = await consultarConvite(token);
  const { data } = await supabase.from("convites_clientes").select("id,cliente_id,usina_id,empresa_id").eq("token_hash", hashToken(token)).single();
  return { ...convite, id: data!.id, cliente_id: data!.cliente_id, usina_id: data!.usina_id, empresa_id: data!.empresa_id };
}

export async function concluirConvite(convite: any, usuarioId: string) {
  let clienteId = convite.cliente_id ?? null;
  if (!clienteId) {
    const { data: cliente, error: clienteError } = await supabase.from("clientes").insert({
      nome: convite.nome,
      cpf: convite.cpf,
      email: convite.email,
      usina_id: convite.usina_id ?? null,
      status: "ATIVO",
      empresa_id: convite.empresa_id,
    }).select("id").single();
    if (clienteError) throw clienteError;
    clienteId = cliente.id;
  }

  const { error: usuarioError } = await supabase.from("usuarios").update({ cliente_id: clienteId, empresa_id: convite.empresa_id }).eq("id", usuarioId);
  if (usuarioError) throw usuarioError;

  const { error: conviteError } = await supabase.from("convites_clientes").update({
    cliente_id: clienteId,
    status: "ACEITO",
    aceito_em: new Date().toISOString(),
  }).eq("id", convite.id).eq("status", "PENDENTE");
  if (conviteError) throw conviteError;
  return clienteId;
}

export async function criarConviteGerador(input: any, administrador: any) {
  if (administrador?.perfil !== "ADMIN") throw new Error("Apenas a conta administradora pode convidar novos geradores.");
  const perfil = String(input?.perfil ?? "GESTOR").toUpperCase() === "ADMIN" ? "ADMIN" : "GESTOR";
  const empresaId = String(input?.empresaId ?? empresaIdDoUsuario(administrador));
  const cpf = cpfLimpo(input.cpf);
  const email = String(input.email ?? "").trim().toLowerCase();
  const nome = String(input.nome ?? "").trim();
  if (!nome) throw new Error("Informe o nome do gerador.");
  if (cpf.length !== 11) throw new Error("Informe um CPF válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");

  const [{ data: contaEmail }, { data: contaCpf }] = await Promise.all([
    supabase.from("usuarios").select("id").eq("empresa_id", empresaId).eq("perfil", perfil).eq("email", email).limit(1).maybeSingle(),
    supabase.from("usuarios").select("id").eq("empresa_id", empresaId).eq("perfil", perfil).eq("cpf", cpf).limit(1).maybeSingle(),
  ]);
  if (contaEmail || contaCpf) throw new Error("Este e-mail ou CPF já possui uma conta geradora.");

  const token = `${perfil === "ADMIN" ? "admin" : "gerador"}_${gerarToken()}`;
  const { error } = await supabase.from("convites_clientes").insert({
    gestor_id: administrador.id, empresa_id: empresaId, nome, cpf, email,
    token_hash: hashToken(token),
    expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;

  const link = `andradeenergygerador://criar-conta?convite=${token}`;
  let emailEnviado = false;
  try {
    emailEnviado = await enviarEmailTransacional({
      destinatario: email,
      assunto: `Convite para Andrade Energy — ${perfil === "ADMIN" ? "Administrador" : "Gerador"}`,
      html: `<div style="max-width:560px;margin:auto;padding:28px;font-family:Arial,sans-serif;color:#252925;line-height:1.6;background:#f7f8f7;border-radius:14px"><h2 style="margin-top:0;color:#39804a">Convite para conta ${perfil === "ADMIN" ? "administrativa" : "geradora"}</h2><p>Olá, <strong>${escaparHtml(nome)}</strong>.</p><p>Você foi convidado pela administração da Andrade Energy para criar uma conta de ${perfil === "ADMIN" ? "administrador" : "gerador"}.</p><p style="margin:26px 0"><a href="${link}" style="display:inline-block;padding:14px 22px;background:#39804a;color:#fff;font-weight:700;text-decoration:none;border-radius:8px">Aceitar convite e criar conta</a></p><p style="font-size:13px;color:#6b706b">Se o botão não abrir o aplicativo, use este código:</p><div style="padding:16px 12px;border:2px dashed #39804a;border-radius:10px;background:#fff;color:#1f512e;font-family:monospace;font-size:20px;font-weight:700;text-align:center;word-break:break-all">${token}</div><p style="font-size:13px;color:#6b706b">Válido por 7 dias.</p></div>`,
    });
  } catch { emailEnviado = false; }
  return { message: "Convite de gerador criado.", emailEnviado, token: emailEnviado ? undefined : token };
}

export async function consultarConviteGerador(token: string) {
  if (!token.startsWith("gerador_") && !token.startsWith("admin_")) throw new Error("Convite de acesso inválido ou expirado.");
  const { data, error } = await supabase.from("convites_clientes").select("id,nome,cpf,email,status,expira_em,empresa_id").eq("token_hash", hashToken(token)).maybeSingle();
  if (error || !data || data.status !== "PENDENTE" || new Date(data.expira_em) <= new Date()) throw new Error("Convite de gerador inválido ou expirado.");
  return { nome: data.nome, cpf: data.cpf, email: data.email, empresa_id: data.empresa_id };
}

export async function aceitarConviteGerador(token: string) {
  const convite = await consultarConviteGerador(token);
  const { data } = await supabase.from("convites_clientes").select("id").eq("token_hash", hashToken(token)).single();
  return { ...convite, id: data!.id };
}

export async function concluirConviteGerador(convite: any, usuarioId: string) {
  const { error } = await supabase.from("convites_clientes").update({ status: "ACEITO", aceito_em: new Date().toISOString() }).eq("id", convite.id).eq("status", "PENDENTE");
  if (error) throw error;
}
