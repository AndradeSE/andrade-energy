import { supabase } from "../../config/supabase";
import { mercadoPagoComercialRequest } from "./mercadoPagoComercial.client";

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

  return { recebido: true, ignorado: true };
}

