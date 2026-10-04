import { supabase } from "../../config/supabase";
import { mercadoPagoComercialRequest } from "./mercadoPagoComercial.client";
import { adesaoIdDaReferencia, registrarPagamentoAdesao } from "./adesaoAssinatura.service";

const statusAssinatura = (status: string) => ({
  authorized: "ATIVA",
  paused: "SUSPENSA",
  cancelled: "CANCELADA",
  canceled: "CANCELADA",
  pending: "PENDENTE",
}[status.toLowerCase()] ?? null);

const statusCobranca = (status: string) => ({
  approved: "PAGA",
  pending: "PENDENTE",
  in_process: "PENDENTE",
  rejected: "RECUSADA",
  cancelled: "CANCELADA",
  canceled: "CANCELADA",
  refunded: "CANCELADA",
}[status.toLowerCase()] ?? "PENDENTE");

function assinaturaIdDaReferencia(value: unknown) {
  const partes = String(value ?? "").split(":");
  return partes[0] === "assinatura" && partes[1] ? partes[1] : null;
}

export async function processarWebhookMercadoPago(tipo: string, dataId: string) {
  if (["subscription_preapproval", "preapproval"].includes(tipo)) {
    const externa = await mercadoPagoComercialRequest<any>(`/preapproval/${encodeURIComponent(dataId)}`);
    const adesaoId = adesaoIdDaReferencia(externa.external_reference);
    if (adesaoId) {
      const { error } = await supabase.from("adesoes_assinaturas").update({ subscription_id: String(externa.id), atualizado_em: new Date().toISOString() }).eq("id",adesaoId).eq("provedor","MERCADO_PAGO");
      if (error) throw error;
      return { recebido: true, aguardandoPagamento: true };
    }
    const assinaturaId = assinaturaIdDaReferencia(externa.external_reference);
    if (!assinaturaId) return { recebido: true, assinaturaNaoAssociada: true };
    const status = statusAssinatura(String(externa.status ?? ""));
    const { error } = await supabase.from("assinaturas_geradores").update({
      provedor_pagamento: "MERCADO_PAGO",
      mercado_pago_preapproval_id: String(externa.id),
      ...(status ? { status } : {}),
      atualizado_em: new Date().toISOString(),
    }).eq("id", assinaturaId);
    if (error) throw error;
    return { recebido: true };
  }

  if (tipo === "payment") {
    const pagamento = await mercadoPagoComercialRequest<any>(`/v1/payments/${encodeURIComponent(dataId)}`);
    const adesaoId = adesaoIdDaReferencia(pagamento.external_reference);
    if (adesaoId) return registrarPagamentoAdesao(adesaoId,"MERCADO_PAGO",pagamento);
    const assinaturaId = assinaturaIdDaReferencia(pagamento.external_reference);
    if (!assinaturaId) return { recebido: true, assinaturaNaoAssociada: true };
    const vencimento = String(pagamento.date_of_expiration ?? pagamento.date_created ?? new Date().toISOString()).slice(0, 10);
    const competencia = vencimento.slice(0, 7);
    const pago = String(pagamento.status).toLowerCase() === "approved";
    const { error } = await supabase.from("cobrancas_assinaturas_geradores").upsert({
      assinatura_id: assinaturaId,
      competencia,
      vencimento,
      valor: Number(pagamento.transaction_amount ?? 0),
      status: statusCobranca(String(pagamento.status ?? "")),
      provedor_pagamento: "MERCADO_PAGO",
      mercado_pago_payment_id: String(pagamento.id),
      invoice_url: pagamento.transaction_details?.external_resource_url ?? null,
      pago_em: pago ? String(pagamento.date_approved ?? new Date().toISOString()) : null,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "assinatura_id,competencia" });
    if (error) throw error;
    if (pago) await supabase.from("assinaturas_geradores").update({ status: "ATIVA", atualizado_em: new Date().toISOString() }).eq("id", assinaturaId);
    return { recebido: true };
  }

  if (tipo === "subscription_authorized_payment") {
    const autorizado = await mercadoPagoComercialRequest<any>(`/authorized_payments/${encodeURIComponent(dataId)}`);
    const preapproval = await mercadoPagoComercialRequest<any>(`/preapproval/${encodeURIComponent(autorizado.preapproval_id)}`);
    const adesaoId = adesaoIdDaReferencia(preapproval.external_reference);
    if (!adesaoId || !autorizado.payment?.id) return { recebido: true, aguardandoPagamento: true };
    const pagamento = await mercadoPagoComercialRequest<any>(`/v1/payments/${encodeURIComponent(autorizado.payment.id)}`);
    return registrarPagamentoAdesao(adesaoId,"MERCADO_PAGO",pagamento);
  }

  return { recebido: true, ignorado: true };
}

