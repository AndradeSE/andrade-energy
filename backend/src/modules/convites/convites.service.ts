import { supabase } from "../../config/supabase";
import { gerarToken, hashToken } from "../../utils/token";
import { enviarEmailTransacional } from "../email/emailTransacional.service";

function cpfLimpo(valor: unknown) { return String(valor ?? "").replace(/\D/g, ""); }

export async function criarConvite(input: any, gestor: any) {
  const cpf = cpfLimpo(input.cpf);
  const email = String(input.email ?? "").trim().toLowerCase();
  const nome = String(input.nome ?? "").trim();
  if (!nome) throw new Error("Informe o nome do consumidor.");
  if (cpf.length !== 11) throw new Error("Informe um CPF válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");

  const { data: clienteExistente } = await supabase.from("clientes").select("id").eq("cpf", cpf).limit(1).maybeSingle();
  const { data: contaEmail } = await supabase
    .from("usuarios")
    .select("id,cliente_id,perfil")
    .eq("email", email)
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
    .eq("perfil", "LEITURA")
    .limit(1)
    .maybeSingle();
  if (contaConsumidorCpf) {
    if (clienteExistente) throw new Error("Este CPF já possui uma conta de consumidor ativa.");
    const { error: erroLimpeza } = await supabase.from("usuarios").delete().eq("id", contaConsumidorCpf.id);
    if (erroLimpeza) throw erroLimpeza;
  }

  const dadosCliente = { nome, cpf, email, usina_id: gestor.usina_id ?? input.usina_id ?? null, status: "ATIVO" };
  const resultadoCliente = clienteExistente
    ? await supabase.from("clientes").update(dadosCliente).eq("id", clienteExistente.id).select("id").single()
    : await supabase.from("clientes").insert(dadosCliente).select("id").single();
  if (resultadoCliente.error) throw resultadoCliente.error;

  const token = gerarToken();
  const { error } = await supabase.from("convites_clientes").insert({
    gestor_id: gestor.id,
    usina_id: gestor.usina_id ?? input.usina_id ?? null,
    cliente_id: resultadoCliente.data.id,
    nome, cpf, email,
    token_hash: hashToken(token),
    expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) throw error;

  const link = `andradeenergyconsumidor://criar-conta?convite=${token}`;
  let emailEnviado = false;
  try {
    emailEnviado = await enviarEmailTransacional({
      destinatario: email,
      assunto: "Convite para Andrade Energy Consumidor",
      html: `<div style="font-family:Arial,sans-serif;color:#252925;line-height:1.6"><h2 style="color:#39804a">Você recebeu um convite</h2><p>Olá, <strong>${nome}</strong>.</p><p>Seu gerador convidou você para acompanhar unidades, economia e faturas no Andrade Energy Consumidor.</p><p><a href="${link}" style="display:inline-block;padding:14px 20px;background:#39804a;color:#fff;text-decoration:none;border-radius:8px">Criar minha conta</a></p><p>Este convite é válido por 7 dias.</p><p style="font-size:12px;color:#6b706b">Código do convite: ${token}</p></div>`,
    });
  } catch {
    emailEnviado = false;
  }
  return { message: "Convite criado.", emailEnviado, token: emailEnviado ? undefined : token };
}

export async function consultarConvite(token: string) {
  const { data, error } = await supabase.from("convites_clientes")
    .select("id,nome,cpf,email,status,expira_em")
    .eq("token_hash", hashToken(token)).maybeSingle();
  if (error || !data || data.status !== "PENDENTE" || new Date(data.expira_em) <= new Date()) throw new Error("Convite inválido ou expirado.");
  return { nome: data.nome, cpf: data.cpf, email: data.email };
}

export async function aceitarConvite(token: string) {
  const convite = await consultarConvite(token);
  const { data } = await supabase.from("convites_clientes").select("id,cliente_id").eq("token_hash", hashToken(token)).single();
  return { ...convite, id: data!.id, cliente_id: data!.cliente_id };
}

export async function concluirConvite(id: string) {
  await supabase.from("convites_clientes").update({ status: "ACEITO", aceito_em: new Date().toISOString() }).eq("id", id).eq("status", "PENDENTE");
}
