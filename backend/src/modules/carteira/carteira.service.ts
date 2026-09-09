import { supabase } from "../../config/supabase";
import { asaasRequest } from "../asaas/asaas.client";
import { empresaIdDoUsuario } from "../../config/empresa";
import { criptografarDado, descriptografarDado } from "../../utils/sensitiveData";
import { auditar } from "../../utils/audit";
import { conferirSenha } from "../../utils/password";

const dinheiro = (valor: unknown) => Math.round(Number(valor ?? 0) * 100) / 100;
const mascarar = (chave: string) => chave.length <= 6 ? "***" : `${chave.slice(0, 2)}***${chave.slice(-4)}`;
export const chavePixDaCarteira = (carteira: any) => carteira.pix_chave_criptografada ? descriptografarDado(carteira.pix_chave_criptografada) : String(carteira.pix_chave ?? "");

export async function obterOuCriarCarteira(usuario: any) {
  const empresaId = empresaIdDoUsuario(usuario);
  const { data: existente, error } = await supabase.from("gerador_carteiras").select("*").eq("usuario_id", usuario.id).eq("empresa_id", empresaId).maybeSingle();
  if (error) throw error;
  if (existente) return existente;
  const { data, error: insertError } = await supabase.from("gerador_carteiras").insert({
    usuario_id: usuario.id,
    usina_id: usuario.usina_id ?? null,
    empresa_id: empresaId,
    status: "ATIVA",
  }).select().single();
  if (insertError) throw insertError;
  return data;
}

export async function buscarCarteiraDaFatura(faturaId: string) {
  const { data: fatura, error } = await supabase.from("faturas").select("usina_id,empresa_id").eq("id", faturaId).single();
  if (error || !fatura) return null;
  if (fatura.usina_id) {
    const { data } = await supabase.from("gerador_carteiras").select("*").eq("usina_id", fatura.usina_id).eq("empresa_id", fatura.empresa_id).eq("status", "ATIVA").maybeSingle();
    if (data) return data;
  }
  const { data: admin } = await supabase.from("usuarios").select("*").eq("empresa_id", fatura.empresa_id).in("perfil", ["ADMIN", "GESTOR"]).eq("ativo", true).limit(1).maybeSingle();
  return admin ? obterOuCriarCarteira(admin) : null;
}

async function movimentosDaCarteira(carteira: any) {
  const { data: cobrancas, error } = await supabase.from("asaas_cobrancas").select("id,fatura_id,status,valor,valor_liquido,criado_em,atualizado_em,faturas(referencia,vencimento)").eq("gerador_carteira_id", carteira.id).order("criado_em", { ascending: false });
  if (error) throw error;
  const { data: transferencias, error: transferError } = await supabase.from("asaas_transferencias").select("id,valor,status,destino_mascarado,modalidade,criado_em,atualizado_em").eq("gerador_carteira_id", carteira.id).order("criado_em", { ascending: false });
  if (transferError) throw transferError;
  return { cobrancas: cobrancas ?? [], transferencias: transferencias ?? [] };
}

export async function resumoCarteira(usuario: any) {
  const carteira = await obterOuCriarCarteira(usuario);
  const { cobrancas, transferencias } = await movimentosDaCarteira(carteira);
  const recebidas = cobrancas.filter((item: any) => ["RECEIVED","CONFIRMED","PAYMENT_RECEIVED","PAYMENT_CONFIRMED"].includes(String(item.status).toUpperCase()));
  const saidas = transferencias.filter((item: any) => !["FAILED","CANCELLED","REFUSED"].includes(String(item.status).toUpperCase()));
  const recebido = dinheiro(recebidas.reduce((soma: number, item: any) => soma + Number(item.valor_liquido ?? item.valor), 0));
  const transferido = dinheiro(saidas.reduce((soma: number, item: any) => soma + Number(item.valor), 0));
  const pendente = dinheiro(cobrancas.filter((item: any) => !recebidas.includes(item)).reduce((soma: number, item: any) => soma + Number(item.valor), 0));
  return {
    id: carteira.id,
    status: carteira.status,
    asaasConectado: Boolean(carteira.asaas_wallet_id) || usuario.perfil === "ADMIN",
    transferenciaAutomatica: carteira.transferencia_automatica,
    pixTipo: carteira.pix_tipo,
    pixChaveMascarada: chavePixDaCarteira(carteira) ? mascarar(chavePixDaCarteira(carteira)) : null,
    saldoDisponivel: dinheiro(Math.max(0, recebido - transferido)),
    saldoPendente: pendente,
    totalRecebido: recebido,
    totalTransferido: transferido,
    cobrancas,
    transferencias,
  };
}

export async function atualizarCarteira(usuario: any, input: any) {
  if (!(await conferirSenha(String(input.senhaAtual ?? ""), String(usuario.senha ?? "")))) throw new Error("Confirme sua senha para alterar os dados financeiros.");
  const carteira = await obterOuCriarCarteira(usuario);
  const pixTipo = String(input.pixTipo ?? carteira.pix_tipo ?? "").toUpperCase();
  const pixChave = String(input.pixChave ?? chavePixDaCarteira(carteira)).trim();
  if (pixTipo && !["CPF","CNPJ","EMAIL","PHONE","EVP"].includes(pixTipo)) throw new Error("Tipo de chave Pix inválido.");
  if (input.transferenciaAutomatica === true && (!pixTipo || !pixChave)) throw new Error("Cadastre uma chave Pix antes de ativar a transferência automática.");
  const { error } = await supabase.from("gerador_carteiras").update({
    pix_tipo: pixTipo || null,
    pix_chave: null,
    pix_chave_criptografada: pixChave ? criptografarDado(pixChave) : null,
    transferencia_automatica: Boolean(input.transferenciaAutomatica),
    atualizado_em: new Date().toISOString(),
  }).eq("id", carteira.id);
  if (error) throw error;
  await auditar({ empresaId: empresaIdDoUsuario(usuario), usuarioId: usuario.id, acao: "CARTEIRA_ATUALIZADA", recurso: "gerador_carteiras", recursoId: carteira.id, detalhes: { pixTipo: pixTipo || null, transferenciaAutomatica: Boolean(input.transferenciaAutomatica) } });
  return resumoCarteira(usuario);
}

export async function transferirCarteira(usuario: any, input: any, idempotencyKey = "") {
  if (String(input.confirmacao ?? "") !== "TRANSFERIR") throw new Error("Confirme a transferência para continuar.");
  if (!(await conferirSenha(String(input.senhaAtual ?? ""), String(usuario.senha ?? "")))) throw new Error("Senha atual incorreta.");
  const carteira = await obterOuCriarCarteira(usuario);
  const pix = chavePixDaCarteira(carteira);
  if (!pix || !carteira.pix_tipo) throw new Error("Cadastre sua chave Pix antes de transferir.");
  const resumo = await resumoCarteira(usuario);
  const valor = dinheiro(input.valor);
  if (!(valor > 0) || valor > resumo.saldoDisponivel) throw new Error("Valor indisponível para transferência.");
  const chaveIdempotencia = idempotencyKey.trim().slice(0, 200) || null;
  if (chaveIdempotencia) {
    const { data: existente, error } = await supabase.from("asaas_transferencias").select("*").eq("empresa_id", empresaIdDoUsuario(usuario)).eq("idempotency_key", chaveIdempotencia).maybeSingle();
    if (error) throw error;
    if (existente) return existente;
  }
  const { data: intencao, error: intentError } = await supabase.from("asaas_transferencias").insert({
    empresa_id: empresaIdDoUsuario(usuario),
    gerador_carteira_id: carteira.id,
    solicitada_por: usuario.id,
    asaas_transfer_id: `intent:${crypto.randomUUID()}`,
    valor,
    status: "AUTHORIZING",
    destino_mascarado: `${carteira.pix_tipo}:${mascarar(pix)}`,
    modalidade: "MANUAL",
    idempotency_key: chaveIdempotencia,
  }).select().single();
  if (intentError) throw intentError;
  try {
    const transfer = await asaasRequest<any>("/transfers", { method: "POST", body: JSON.stringify({
      value: valor,
      pixAddressKey: pix,
      pixAddressKeyType: carteira.pix_tipo,
      operationType: "PIX",
      description: `Saque carteira Andrade ${carteira.id}`,
      externalReference: String(intencao.id),
    }) });
    const { data, error } = await supabase.from("asaas_transferencias").update({ asaas_transfer_id: transfer.id, status: transfer.status, atualizado_em: new Date().toISOString() }).eq("id", intencao.id).select().single();
    if (error) throw error;
    await auditar({ empresaId: empresaIdDoUsuario(usuario), usuarioId: usuario.id, acao: "TRANSFERENCIA_SOLICITADA", recurso: "asaas_transferencias", recursoId: data.id, detalhes: { valor, destino: `${carteira.pix_tipo}:${mascarar(pix)}` } });
    return data;
  } catch (error) {
    await supabase.from("asaas_transferencias").update({ status: "REFUSED", atualizado_em: new Date().toISOString() }).eq("id", intencao.id);
    throw error;
  }
}
