import { supabase } from "../../config/supabase";
import { permissaoComercial, PermissaoComercial } from "./permissoesComerciais";
import { enviarEmailTransacional } from "../email/emailTransacional.service";

function exigir(usuario: any, chave: PermissaoComercial) {
  if (!permissaoComercial(usuario, chave)) throw new Error("Ação não liberada pelo administrador.");
}
const html = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
async function auditar(usuario: any, acao: string, recurso: string, id: string) {
  const { error } = await supabase.from("auditoria_seguranca").insert({ empresa_id: usuario.empresa_id, usuario_id: usuario.id, acao, recurso, recurso_id: id });
  if (error) throw error;
}
export async function recursosDelegados(usuario: any) {
  const [planos, documentos, cobrancas] = await Promise.all([
    permissaoComercial(usuario, "planos_consultar") || permissaoComercial(usuario, "propostas_preparar") || permissaoComercial(usuario, "geradores_convidar")
      ? supabase.from("planos_geradores").select("id,nome,descricao,valor_mensal,valor_anual,recursos,ativo").eq("ativo", true).order("valor_mensal") : { data: [], error: null },
    permissaoComercial(usuario, "documentos") || permissaoComercial(usuario, "contratos_consultar")
      ? supabase.from("documentos_comerciais").select("id,tipo,titulo,versao,conteudo").eq("ativo", true) : { data: [], error: null },
    permissaoComercial(usuario, "cobrancas_consultar")
      ? supabase.from("cobrancas_assinaturas_geradores").select("id,competencia,valor,vencimento,status,assinatura:assinaturas_geradores!cobrancas_assinaturas_geradores_assinatura_id_fkey(gerador:usuarios!assinaturas_geradores_gerador_id_fkey(nome))").in("status", ["PENDENTE", "VENCIDA", "OVERDUE"]).order("vencimento") : { data: [], error: null },
  ]);
  for (const r of [planos, documentos, cobrancas]) if (r.error) throw r.error;
  return { planos: planos.data ?? [], documentos: documentos.data ?? [], cobrancas: cobrancas.data ?? [] };
}
export async function editarContatoGerador(usuario: any, id: string, input: any) {
  exigir(usuario, "geradores_editar");
  if (Object.keys(input ?? {}).some(k => !["nome", "telefone"].includes(k))) throw new Error("Somente nome e telefone podem ser editados por esta ação.");
  const nome = String(input?.nome ?? "").trim();
  const telefone = String(input?.telefone ?? "").replace(/\D/g, "");
  if (nome.length < 5 || !nome.includes(" ") || (telefone && !/^\d{10,13}$/.test(telefone))) throw new Error("Informe nome completo e telefone com DDD.");
  const { data: alvo, error } = await supabase.from("usuarios").select("id,perfil,empresa_id").eq("id", id).eq("perfil", "GESTOR").maybeSingle();
  if (error) throw error;
  const { data: titular } = await supabase.from("empresa_usuarios").select("id").eq("usuario_id", id).in("papel", ["ADMIN_EMPRESA", "GESTOR"]).eq("ativo", true).limit(1).maybeSingle();
  if (!alvo || !titular) throw new Error("Conta geradora não encontrada ou protegida.");
  await auditar(usuario, "COMERCIAL_EDICAO_CONTATO_SOLICITADA", "usuarios", id);
  const resultado = await supabase.from("usuarios").update({ nome, telefone }).eq("id", id).eq("perfil", "GESTOR").select("id,nome,telefone").single();
  if (resultado.error) throw resultado.error;
  return resultado.data;
}
export async function enviarDocumentoAprovado(usuario: any, id: string, geradorId: string) {
  exigir(usuario, "documentos_enviar"); exigir(usuario, "documentos"); exigir(usuario, "geradores");
  const { data: doc, error } = await supabase.from("documentos_comerciais").select("id,titulo,versao,conteudo").eq("id", id).eq("ativo", true).maybeSingle();
  if (error) throw error;
  const { data: alvo } = await supabase.from("usuarios").select("id,nome,email").eq("id", geradorId).eq("perfil", "GESTOR").eq("ativo", true).maybeSingle();
  if (!doc || !alvo) throw new Error("Documento aprovado ou gerador não encontrado.");
  await auditar(usuario, "COMERCIAL_ENVIO_DOCUMENTO_SOLICITADO", "documentos_comerciais", id);
  const enviado = await enviarEmailTransacional({ empresaId: usuario.empresa_id, destinatario: alvo.email, assunto: `${doc.titulo} — Andrade Energy`, html: `<p>Olá, ${html(alvo.nome)}.</p><h2>${html(doc.titulo)}</h2><p>Versão ${html(doc.versao)}</p><pre style="white-space:pre-wrap;font-family:Arial">${html(doc.conteudo)}</pre>`, idempotencyKey: `doc-comercial:${id}:${geradorId}:${new Date().toISOString().slice(0,10)}` });
  if (!enviado) throw new Error("O e-mail não foi entregue. Tente novamente mais tarde.");
  return { enviado: true };
}
export async function lembrarCobranca(usuario: any, id: string) {
  exigir(usuario, "cobrancas_lembrar");
  const { data: cobranca, error } = await supabase.from("cobrancas_assinaturas_geradores").select("id,valor,vencimento,status,competencia,assinatura:assinaturas_geradores!cobrancas_assinaturas_geradores_assinatura_id_fkey(gerador:usuarios!assinaturas_geradores_gerador_id_fkey(nome,email))").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!cobranca || !["PENDENTE", "VENCIDA", "OVERDUE"].includes(cobranca.status)) throw new Error("Esta cobrança não está pendente.");
  const assinatura: any = Array.isArray(cobranca.assinatura) ? cobranca.assinatura[0] : cobranca.assinatura;
  const gerador = Array.isArray(assinatura?.gerador) ? assinatura.gerador[0] : assinatura?.gerador;
  if (!gerador?.email) throw new Error("Gerador sem e-mail cadastrado.");
  await auditar(usuario, "COMERCIAL_LEMBRETE_COBRANCA_SOLICITADO", "cobrancas_assinaturas_geradores", id);
  const enviado = await enviarEmailTransacional({ empresaId: usuario.empresa_id, destinatario: gerador.email, assunto: "Lembrete de assinatura — Andrade Energy", html: `<p>Olá, ${html(gerador.nome)}.</p><p>Consta pendente a assinatura do sistema da competência ${html(cobranca.competencia)}, no valor de ${html(Number(cobranca.valor).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}))}, vencimento ${html(cobranca.vencimento)}.</p><p>Consulte sua assinatura no aplicativo para regularizar.</p><p>Caso o pagamento já tenha sido efetuado, desconsidere este aviso.</p>`, idempotencyKey: `lembrete-comercial:${id}:${new Date().toISOString().slice(0,10)}` });
  if (!enviado) throw new Error("O e-mail não foi entregue. Tente novamente mais tarde.");
  return { enviado: true };
}
