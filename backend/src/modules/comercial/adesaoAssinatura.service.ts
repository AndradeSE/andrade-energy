import { createHash } from "node:crypto";
import { supabase } from "../../config/supabase";
import { EMPRESA_ANDRADE_ID } from "../../config/empresa";
import { gerarToken, hashToken } from "../../utils/token";
import { criptografarDado, descriptografarDado } from "../../utils/sensitiveData";
import { appScheme } from "../../utils/appScheme";
import { validarCadastroCliente } from "../clientes/validacaoCadastro";
import { enviarEmailTransacional } from "../email/emailTransacional.service";
import { emailDestinatarioPermitido } from "../email/destinatariosPermitidos";
import { microsoftEmailConfigurado } from "../email/microsoftEmail.service";
import { obterTermosAssinatura } from "./comercial.service";
import { provedorPagamentoComercial } from "./provedorPagamento";
import { asaasComercialConfigurado, asaasComercialRequest } from "./asaasComercial.client";
import { mercadoPagoComercialRequest } from "./mercadoPagoComercial.client";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
export const adesaoIdDaReferencia = (v: unknown) => /^adesao:([0-9a-f-]{36})$/i.exec(String(v ?? ""))?.[1] ?? null;
const site = () => String(process.env.PORTAL_WEB_URL ?? "https://andradeenergy.com.br").replace(/\/$/, "");
const escape = (v: string) => v.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
const ok = (result: any) => { if (result.error) throw result.error; return result.data; };
const centavos = (v: unknown) => Math.round(Number(v) * 100);
const envioConfigurado = async () => Boolean(process.env.RESEND_API_KEY || (process.env.BREVO_API_KEY && process.env.BREVO_REMETENTE_EMAIL) || await microsoftEmailConfigurado());

export async function configuracaoAdesaoPublica() {
  const termos = await obterTermosAssinatura();
  let provedor: string | null = null;
  try { provedor = provedorPagamentoComercial(); } catch { /* indisponível */ }
  const migracao = await supabase.from("adesoes_assinaturas").select("id", { head: true, count: "exact" }).limit(0);
  return { ...termos, disponivel: termos.pronto && Boolean(provedor) && !migracao.error && await envioConfigurado(),
    parcelamentoAnual: asaasComercialConfigurado(), provedor };
}

export async function criarAdesaoPublica(input: any, chave: string, origem: { ip?: string; userAgent?: string }) {
  if (!/^[a-z0-9-]{32,80}$/i.test(chave)) throw new Error("Reabra o formulário e tente novamente.");
  const dados = {
    nome: `${String(input?.nome ?? "").trim()} ${String(input?.sobrenome ?? "").trim()}`.trim(),
    cpf: String(input?.cpf ?? "").replace(/\D/g, ""),
    email: String(input?.email ?? "").trim().toLowerCase(),
    telefone: String(input?.telefone ?? "").replace(/\D/g, ""),
    endereco: String(input?.endereco ?? "").trim(),
    plano_id: String(input?.planoId ?? ""),
    ciclo: String(input?.ciclo ?? "MENSAL"),
    parcelas: input?.ciclo === "ANUAL" && input?.parcelamentoAnual === true ? 12 : 1,
  };
  if (!String(input?.nome ?? "").trim() || !String(input?.sobrenome ?? "").trim()) throw new Error("Preencha Nome e Sobrenome.");
  const erro = validarCadastroCliente(dados);
  if (erro) throw new Error(erro);
  if (!/^\d{10,11}$/.test(dados.telefone)) throw new Error("Informe o telefone com DDD.");
  if (!emailDestinatarioPermitido(dados.email) || !await envioConfigurado()) throw new Error("Convites por e-mail indisponíveis no momento. Tente novamente mais tarde.");
  if (!/^[0-9a-f-]{36}$/i.test(dados.plano_id) || !["MENSAL","ANUAL"].includes(dados.ciclo)) throw new Error("Escolha o plano e o ciclo.");
  const termos = await obterTermosAssinatura();
  if (!termos.pronto || !Array.isArray(input?.aceitesDocumentoIds) || termos.documentos.some((d: any) => !input.aceitesDocumentoIds.includes(d.id))) throw new Error("Leia e aceite os documentos vigentes antes de continuar.");
  const dadosHash = sha(JSON.stringify({ ...dados, documentos: termos.documentos.map((d: any) => d.id).sort() }));
  const existente = ok(await supabase.from("adesoes_assinaturas").select("*").eq("chave_hash", sha(chave)).maybeSingle());
  if (existente) {
    if (existente.dados_hash !== dadosHash) throw new Error("O cadastro foi alterado. Inicie uma nova contratação.");
    if (existente.checkout_url && existente.status === "AGUARDANDO_PAGAMENTO") return { url: existente.checkout_url };
    if (["PAGO","CONVITE_ENVIADO","CONCLUIDO"].includes(existente.status)) throw new Error("Pagamento já confirmado. Confira o convite no e-mail.");
    throw new Error("O pagamento anterior está sendo verificado. Aguarde a confirmação antes de iniciar outro checkout.");
  }
  const contas = await Promise.all(["email","cpf"].map(campo => supabase.from("usuarios").select("id").in("perfil", ["GESTOR","ADMIN"]).eq(campo, dados[campo as "email"|"cpf"]).limit(1)));
  if (contas.some(r => ok(r)?.length)) throw new Error("Você já tem uma conta geradora. Entre no portal e acesse Minha assinatura.");
  const plano = ok(await supabase.from("planos_geradores").select("*").eq("id", dados.plano_id).eq("ativo", true).maybeSingle());
  if (!plano) throw new Error("Plano não encontrado ou indisponível.");
  const valor = Number(dados.ciclo === "ANUAL" ? plano.valor_anual : plano.valor_mensal);
  if (!(valor > 0)) throw new Error("Plano indisponível para contratação.");
  const provedor = dados.parcelas > 1 && asaasComercialConfigurado() ? "ASAAS" : provedorPagamentoComercial();
  if (dados.parcelas > 1 && provedor !== "ASAAS") throw new Error("Parcelamento anual indisponível. Escolha o pagamento anual à vista.");
  // Verifica a criptografia antes de abrir o checkout; o convite poderá ser recuperado pela fila.
  criptografarDado("verificacao-adesao");
  const insercao = await supabase.from("adesoes_assinaturas").insert({ ...dados, valor, provedor,
    chave_hash: sha(chave), dados_hash: dadosHash, documentos: termos.documentos,
    ip: origem.ip ?? null, user_agent: origem.userAgent?.slice(0,500) ?? null }).select().single();
  if (insercao.error?.code === "23505") throw new Error("Esta contratação já está em andamento. Aguarde antes de tentar novamente.");
  const a = ok(insercao);
  const retorno = `${site()}/assinar#${encodeURIComponent(chave)}`;
  try {
    let checkout: any;
    if (provedor === "MERCADO_PAGO") {
      checkout = await mercadoPagoComercialRequest<any>("/preapproval", { method: "POST", headers: { "X-Idempotency-Key": a.id },
        body: JSON.stringify({ reason: `${plano.nome} · Andrade Energy`, external_reference: `adesao:${a.id}`, payer_email: dados.email,
          auto_recurring: { frequency: dados.ciclo === "ANUAL" ? 12 : 1, frequency_type: "months", transaction_amount: valor, currency_id: "BRL" },
          back_url: retorno, status: "pending" }) });
    } else {
      const campo = (n: string) => dados.endereco.match(new RegExp(`^${n}: (.*)$`, "m"))?.[1]?.trim() ?? "";
      checkout = await asaasComercialRequest<any>("/checkouts", { method: "POST", body: JSON.stringify({
        billingTypes: ["CREDIT_CARD"], chargeTypes: dados.parcelas > 1 ? ["INSTALLMENT"] : ["RECURRENT"], minutesToExpire: 1440,
        externalReference: `adesao:${a.id}`, callback: { successUrl: retorno, cancelUrl: retorno, expiredUrl: retorno },
        items: [{ name: plano.nome, description: `Assinatura ${dados.ciclo.toLowerCase()} Andrade Energy`, quantity: 1, value: valor }],
        customerData: { name: dados.nome, cpfCnpj: dados.cpf, email: dados.email, phone: dados.telefone,
          postalCode: campo("CEP").replace(/\D/g,""), address: campo("Logradouro"), addressNumber: campo("Número"), complement: campo("Complemento"), province: campo("Bairro") },
        ...(dados.parcelas > 1 ? { installment: { maxInstallmentCount: 12 } } : { subscription: { cycle: dados.ciclo === "ANUAL" ? "YEARLY" : "MONTHLY", nextDueDate: `${new Date().toISOString().slice(0,10)} 12:00:00` } }),
      }) });
    }
    const url = checkout.url ?? checkout.checkoutUrl ?? checkout.link ?? checkout.init_point ?? checkout.sandbox_init_point;
    if (!url || !checkout.id) throw new Error("O provedor não retornou o endereço do pagamento.");
    ok(await supabase.from("adesoes_assinaturas").update({ checkout_id: String(checkout.id), checkout_url: url, status: "AGUARDANDO_PAGAMENTO", atualizado_em: new Date().toISOString() }).eq("id", a.id).eq("status", "CRIANDO"));
    return { url };
  } catch (e: any) {
    await supabase.from("adesoes_assinaturas").update({ erro: "Não foi possível concluir a abertura do checkout.", atualizado_em: new Date().toISOString() }).eq("id", a.id);
    throw e;
  }
}

export async function statusAdesaoPublica(chave: string) {
  if (!/^[a-z0-9-]{32,80}$/i.test(chave)) throw new Error("Contratação não encontrada.");
  const a = ok(await supabase.from("adesoes_assinaturas").select("status,convite_enviado_em,checkout_url").eq("chave_hash", sha(chave)).maybeSingle());
  if (!a) throw new Error("Contratação não encontrada.");
  return { status: a.status, conviteEnviado: Boolean(a.convite_enviado_em), url: a.status === "AGUARDANDO_PAGAMENTO" ? a.checkout_url : null };
}

export async function enviarConviteAdesao(id: string) {
  const token = `gerador_${gerarToken()}`;
  const a = ok(await supabase.rpc("preparar_convite_adesao", { p_id: id, p_token_hash: hashToken(token), p_token_criptografado: criptografarDado(token) }));
  if (a.convite_enviado_em || a.status === "CONCLUIDO") return;
  const chave = descriptografarDado(a.convite_token_criptografado);
  const link = `${appScheme("gerador")}://criar-conta?convite=${encodeURIComponent(chave)}`;
  const web = `${site()}/convite-gerador?convite=${encodeURIComponent(chave)}`;
  ok(await supabase.from("adesoes_assinaturas").update({ ultima_tentativa_em: new Date().toISOString(), tentativas: Number(a.tentativas) + 1 }).eq("id", id));
  const enviado = await enviarEmailTransacional({ empresaId: EMPRESA_ANDRADE_ID, destinatario: a.email,
    assunto: "Pagamento confirmado — crie sua conta Andrade Energy", idempotencyKey: `adesao-convite-${id}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#17382d"><h2>Seu plano está confirmado</h2><p>Olá, ${escape(a.nome)}.</p><p>Recebemos a confirmação do pagamento. Seus dados cadastrais já estão preenchidos; escolha sua senha para acessar o Gerador.</p><p><a href="${link}">Criar conta no aplicativo</a></p><p><a href="${web}">Criar conta pelo navegador</a></p><p>Chave do convite: <strong>${escape(chave)}</strong></p><p>O convite é válido por 7 dias.</p><p><a href="${site()}/downloads/andrade-energy-gerador.apk">Baixar o Gerador para Android</a></p></div>` });
  if (!enviado) throw new Error("Convite aguardando nova tentativa de envio.");
  ok(await supabase.from("adesoes_assinaturas").update({ status: "CONVITE_ENVIADO", convite_enviado_em: new Date().toISOString(), erro: null, atualizado_em: new Date().toISOString() }).eq("id", id).eq("status", "PAGO"));
}

let filaOcupada = false;
export async function processarConvitesAdesoes() {
  if (filaOcupada) return;
  filaOcupada = true;
  try {
    const resultado = await supabase.from("adesoes_assinaturas").select("id,tentativas").eq("status", "PAGO")
      .or(`ultima_tentativa_em.is.null,ultima_tentativa_em.lt.${new Date(Date.now()-5*60_000).toISOString()}`).order("pago_em").limit(10);
    if (resultado.error?.code === "42P01" || resultado.error?.code === "PGRST205") return;
    for (const a of ok(resultado) ?? []) {
      try { await enviarConviteAdesao(a.id); }
      catch { await supabase.from("adesoes_assinaturas").update({ erro: "Convite aguardando nova tentativa de envio.", ultima_tentativa_em: new Date().toISOString() }).eq("id", a.id).eq("status", "PAGO"); }
    }
  } finally { filaOcupada = false; }
}

export function pagamentoAdesaoValido(a: any, pagamento: any) {
  if (!pagamento?.id || !["CONFIRMED","RECEIVED","approved"].includes(String(pagamento.status))) return false;
  const valor = pagamento.value ?? pagamento.transaction_amount;
  // No anual parcelado, a confirmação da primeira parcela libera o período anual.
  const esperado = a.parcelas > 1 ? Number(a.valor)/a.parcelas : Number(a.valor);
  return Number.isFinite(Number(valor)) && Math.abs(centavos(valor)-centavos(esperado)) <= 1;
}

export async function registrarPagamentoAdesao(id: string, provedor: string, pagamento: any) {
  const a = ok(await supabase.from("adesoes_assinaturas").select("*").eq("id", id).eq("provedor", provedor).maybeSingle());
  if (!a) throw new Error("Contratação não encontrada para o pagamento.");
  if (!pagamentoAdesaoValido(a, pagamento)) return { recebido: true, aguardandoPagamento: true };
  if (a.status === "CANCELADO") return { recebido: true, cancelado: true };
  const pagoEm = pagamento.confirmedDate ?? pagamento.paymentDate ?? pagamento.date_approved ?? new Date().toISOString();
  const dataPago = new Date(pagoEm).toISOString();
  const changes = { status: "PAGO", pagamento_id: String(pagamento.id), pago_em: dataPago,
    customer_id: pagamento.customer ? String(pagamento.customer) : a.customer_id,
    subscription_id: pagamento.subscription ? String(pagamento.subscription) : a.subscription_id,
    vencimento: String(pagamento.dueDate ?? dataPago).slice(0,10), erro: null, atualizado_em: new Date().toISOString() };
  if (!["PAGO","CONVITE_ENVIADO","CONCLUIDO"].includes(a.status)) ok(await supabase.from("adesoes_assinaturas").update(changes).eq("id", id).in("status", ["CRIANDO","AGUARDANDO_PAGAMENTO"]));
  if (a.assinatura_id) {
    ok(await supabase.from("cobrancas_assinaturas_geradores").upsert({ assinatura_id: a.assinatura_id,
      competencia: changes.vencimento.slice(0,7), vencimento: changes.vencimento, valor: Number(pagamento.value ?? pagamento.transaction_amount), status: "PAGA",
      provedor_pagamento: provedor, ...(provedor === "ASAAS" ? { asaas_payment_id: String(pagamento.id) } : { mercado_pago_payment_id: String(pagamento.id) }), pago_em: dataPago,
      invoice_url: pagamento.invoiceUrl ?? pagamento.transaction_details?.external_resource_url ?? null }, { onConflict: "assinatura_id,competencia" }));
    ok(await supabase.from("assinaturas_geradores").update({ status: "ATIVA", atualizado_em: new Date().toISOString() }).eq("id", a.assinatura_id));
  }
  await processarConvitesAdesoes();
  return { recebido: true };
}

export async function processarAdesaoAsaas(body: any) {
  const id = adesaoIdDaReferencia(body.payment?.externalReference ?? body.checkout?.externalReference ?? body.subscription?.externalReference);
  const a = id ? ok(await supabase.from("adesoes_assinaturas").select("*").eq("id",id).eq("provedor","ASAAS").maybeSingle())
    : body.checkout?.id ? ok(await supabase.from("adesoes_assinaturas").select("*").eq("checkout_id",String(body.checkout.id)).eq("provedor","ASAAS").maybeSingle())
    : body.payment?.subscription || body.subscription?.id
      ? ok(await supabase.from("adesoes_assinaturas").select("*").eq("subscription_id",String(body.payment?.subscription ?? body.subscription.id)).eq("provedor","ASAAS").maybeSingle())
      : null;
  if (!a) return null;
  if (body.subscription?.id) ok(await supabase.from("adesoes_assinaturas").update({ subscription_id: String(body.subscription.id), customer_id: body.subscription.customer ?? a.customer_id }).eq("id",a.id));
  if (body.payment?.id) {
    const pagamento = await asaasComercialRequest<any>(`/payments/${encodeURIComponent(body.payment.id)}`);
    if (adesaoIdDaReferencia(pagamento.externalReference) !== a.id && !(a.subscription_id && String(pagamento.subscription ?? "") === String(a.subscription_id))) throw new Error("Pagamento não corresponde à contratação.");
    if (["REFUNDED","REFUND_REQUESTED","DELETED"].includes(String(pagamento.status))) {
      if (a.assinatura_id) ok(await supabase.from("assinaturas_geradores").update({status:"SUSPENSA"}).eq("id",a.assinatura_id));
      else { ok(await supabase.from("adesoes_assinaturas").update({status:"CANCELADO"}).eq("id",a.id)); if(a.convite_id) ok(await supabase.from("convites_clientes").update({status:"CANCELADO"}).eq("id",a.convite_id).eq("status","PENDENTE")); }
      return { recebido: true };
    }
    return registrarPagamentoAdesao(a.id,"ASAAS",pagamento);
  }
  if (body.event === "CHECKOUT_PAID") {
    const lista = await asaasComercialRequest<any>(`/payments?externalReference=${encodeURIComponent(`adesao:${a.id}`)}&limit=100`);
    for (const p of lista.data ?? []) if (pagamentoAdesaoValido(a,p)) return registrarPagamentoAdesao(a.id,"ASAAS",p);
  }
  return { recebido: true };
}

export async function concluirAdesaoNoCadastro(conviteId: string, usuarioId: string) {
  return ok(await supabase.rpc("concluir_adesao_assinatura", { p_convite_id: conviteId, p_usuario_id: usuarioId }));
}
