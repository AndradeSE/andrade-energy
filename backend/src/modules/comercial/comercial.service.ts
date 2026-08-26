import { supabase } from "../../config/supabase";
import { asaasRequest } from "../asaas/asaas.client";

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const isoDate = (value: unknown) => {
  const text = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Informe uma data válida.");
  return text;
};

export async function obterPainelComercial() {
  const [{ data: planos, error: erroPlanos }, { data: assinaturas, error: erroAssinaturas }, { data: documentos, error: erroDocumentos }, { data: geradores, error: erroGeradores }] = await Promise.all([
    supabase.from("planos_geradores").select("*").order("valor_mensal"),
    supabase.from("assinaturas_geradores").select("*, plano:planos_geradores(*), gerador:usuarios(id,nome,email,cpf,telefone,ativo,created_at)").order("criado_em", { ascending: false }),
    supabase.from("documentos_comerciais").select("id,tipo,titulo,versao,ativo,publicado_em,criado_em").order("criado_em", { ascending: false }),
    supabase.from("usuarios").select("id,nome,email,cpf,telefone,ativo,perfil,created_at").in("perfil", ["ADMIN", "GESTOR"]).order("nome"),
  ]);
  if (erroPlanos) throw erroPlanos;
  if (erroAssinaturas) throw erroAssinaturas;
  if (erroDocumentos) throw erroDocumentos;
  if (erroGeradores) throw erroGeradores;
  const lista = assinaturas ?? [];
  return {
    resumo: {
      total: lista.length,
      ativas: lista.filter((item: any) => ["ATIVA", "TESTE"].includes(item.status)).length,
      inadimplentes: lista.filter((item: any) => item.status === "INADIMPLENTE").length,
      receitaMensalPrevista: lista.filter((item: any) => item.status === "ATIVA").reduce((total: number, item: any) => total + (item.ciclo === "ANUAL" ? Number(item.valor_contratado) / 12 : Number(item.valor_contratado)), 0),
    },
    planos: planos ?? [], assinaturas: lista, documentos: documentos ?? [], geradores: geradores ?? [],
  };
}

export async function salvarPlano(id: string | undefined, input: any) {
  const nome = String(input?.nome ?? "").trim();
  const valorMensal = Number(input?.valorMensal);
  const valorAnual = Number(input?.valorAnual);
  if (!nome || valorMensal < 0 || valorAnual < 0) throw new Error("Informe nome e valores válidos para o plano.");
  const payload = {
    nome, descricao: String(input?.descricao ?? "").trim() || null,
    valor_mensal: valorMensal, valor_anual: valorAnual,
    limite_usinas: input?.limiteUsinas ? Number(input.limiteUsinas) : null,
    limite_clientes: input?.limiteClientes ? Number(input.limiteClientes) : null,
    recursos: Array.isArray(input?.recursos) ? input.recursos : [],
    ativo: input?.ativo !== false, atualizado_em: new Date().toISOString(),
  };
  const query = id ? supabase.from("planos_geradores").update(payload).eq("id", id) : supabase.from("planos_geradores").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function contratarPlano(input: any, adminId: string) {
  const geradorId = String(input?.geradorId ?? "");
  const planoId = String(input?.planoId ?? "");
  const ciclo = String(input?.ciclo ?? "MENSAL").toUpperCase();
  if (!geradorId || !planoId || !["MENSAL", "ANUAL"].includes(ciclo)) throw new Error("Informe gerador, plano e ciclo.");
  const [{ data: gerador }, { data: plano }] = await Promise.all([
    supabase.from("usuarios").select("id,perfil").eq("id", geradorId).in("perfil", ["GESTOR", "ADMIN"]).maybeSingle(),
    supabase.from("planos_geradores").select("*").eq("id", planoId).eq("ativo", true).maybeSingle(),
  ]);
  if (!gerador) throw new Error("Gerador não encontrado.");
  if (!plano) throw new Error("Plano não encontrado ou inativo.");
  await supabase.from("assinaturas_geradores").update({ status: "CANCELADA", cancelada_em: new Date().toISOString(), atualizado_em: new Date().toISOString() }).eq("gerador_id", geradorId).in("status", ["TESTE", "ATIVA", "INADIMPLENTE", "SUSPENSA"]);
  const payload = {
    gerador_id: geradorId, plano_id: planoId, ciclo,
    status: input?.diasTeste ? "TESTE" : "ATIVA",
    forma_pagamento: String(input?.formaPagamento ?? "BOLETO").toUpperCase(),
    valor_contratado: ciclo === "ANUAL" ? plano.valor_anual : plano.valor_mensal,
    inicio_em: isoDate(input?.inicioEm ?? new Date().toISOString()),
    proximo_vencimento: isoDate(input?.proximoVencimento),
    fim_teste_em: input?.diasTeste ? new Date(Date.now() + Number(input.diasTeste) * 86400000).toISOString().slice(0, 10) : null,
    observacoes: String(input?.observacoes ?? "").trim() || null, criado_por: adminId,
  };
  const { data, error } = await supabase.from("assinaturas_geradores").insert(payload).select("*, plano:planos_geradores(*), gerador:usuarios(id,nome,email,cpf,telefone,ativo)").single();
  if (error) throw error;
  return data;
}

export async function alterarStatusAssinatura(id: string, status: string) {
  const normalized = String(status).toUpperCase();
  if (!["ATIVA", "INADIMPLENTE", "SUSPENSA", "CANCELADA"].includes(normalized)) throw new Error("Status de assinatura inválido.");
  const { data, error } = await supabase.from("assinaturas_geradores").update({ status: normalized, cancelada_em: normalized === "CANCELADA" ? new Date().toISOString() : null, atualizado_em: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function gerarCobrancaAssinatura(id: string) {
  const { data: assinatura, error } = await supabase.from("assinaturas_geradores").select("*, gerador:usuarios(*)").eq("id", id).single();
  if (error || !assinatura) throw new Error("Assinatura não encontrada.");
  if (["CANCELADA", "SUSPENSA"].includes(assinatura.status)) throw new Error("Esta assinatura não permite novas cobranças.");
  const gerador: any = Array.isArray(assinatura.gerador) ? assinatura.gerador[0] : assinatura.gerador;
  if (!digits(gerador?.cpf)) throw new Error("Cadastre o CPF/CNPJ do gerador antes de cobrar.");
  const customers = await asaasRequest<any>(`/customers?cpfCnpj=${digits(gerador.cpf)}`);
  const customer = customers.data?.[0] ?? await asaasRequest<any>("/customers", { method: "POST", body: JSON.stringify({ name: gerador.nome, cpfCnpj: digits(gerador.cpf), email: gerador.email || undefined, mobilePhone: digits(gerador.telefone) || undefined, externalReference: gerador.id }) });
  const dueDate = isoDate(assinatura.proximo_vencimento ?? new Date(Date.now() + 7 * 86400000).toISOString());
  const competencia = dueDate.slice(0, 7);
  const payment = await asaasRequest<any>("/payments", { method: "POST", body: JSON.stringify({ customer: customer.id, billingType: assinatura.forma_pagamento === "UNDEFINED" ? "BOLETO" : assinatura.forma_pagamento, value: Number(assinatura.valor_contratado), dueDate, description: `Licença Andrade Energy · ${assinatura.ciclo.toLowerCase()}`, externalReference: `assinatura:${assinatura.id}:${competencia}` }) });
  const [pix, boleto] = await Promise.all([asaasRequest<any>(`/payments/${payment.id}/pixQrCode`).catch(() => null), asaasRequest<any>(`/payments/${payment.id}/identificationField`).catch(() => null)]);
  const { data, error: saveError } = await supabase.from("cobrancas_assinaturas_geradores").upsert({ assinatura_id: id, competencia, vencimento: dueDate, valor: assinatura.valor_contratado, status: "PENDENTE", asaas_payment_id: payment.id, invoice_url: payment.invoiceUrl ?? null, bank_slip_url: payment.bankSlipUrl ?? payment.invoiceUrl ?? null, pix_payload: pix?.payload ?? null, linha_digitavel: boleto?.identificationField ?? null, atualizado_em: new Date().toISOString() }, { onConflict: "assinatura_id,competencia" }).select().single();
  if (saveError) throw saveError;
  return data;
}

export async function listarCobrancasAssinatura(id: string) {
  const { data, error } = await supabase.from("cobrancas_assinaturas_geradores").select("*").eq("assinatura_id", id).order("vencimento", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
