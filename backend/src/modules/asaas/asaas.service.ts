import { supabase } from "../../config/supabase";
import { asaasRequest } from "./asaas.client";

function digits(value: unknown) { return String(value ?? "").replace(/\D/g, ""); }
function dueDate(value: unknown) { const text=String(value??"").slice(0,10); return /^\d{4}-\d{2}-\d{2}$/.test(text)?text:new Date(Date.now()+7*86400000).toISOString().slice(0,10); }

export async function criarCobrancaAsaas(faturaId: string) {
  const { data: existing } = await supabase.from("asaas_cobrancas").select("*").eq("fatura_id", faturaId).maybeSingle();
  if (existing?.asaas_payment_id) return existing;
  const { data: invoice, error } = await supabase.from("faturas").select("*, clientes(*)").eq("id", faturaId).single();
  if (error || !invoice) throw new Error("Fatura não encontrada.");
  const customerData = Array.isArray(invoice.clientes) ? invoice.clientes[0] : invoice.clientes;
  if (!customerData?.cpf) throw new Error("Informe o CPF/CNPJ do cliente antes de gerar a cobrança.");
  const customers = await asaasRequest<any>(`/customers?cpfCnpj=${digits(customerData.cpf)}`);
  const customer = customers.data?.[0] ?? await asaasRequest<any>("/customers", { method:"POST", body:JSON.stringify({ name:customerData.nome, cpfCnpj:digits(customerData.cpf), email:customerData.email||undefined, mobilePhone:digits(customerData.whatsapp||customerData.telefone)||undefined, externalReference:customerData.id }) });
  const value = Number(invoice.valor_total_unificado ?? invoice.valor_total ?? 0);
  if (!(value > 0)) throw new Error("A fatura não possui valor válido para cobrança.");
  const payment = await asaasRequest<any>("/payments", { method:"POST", body:JSON.stringify({ customer:customer.id, billingType:process.env.ASAAS_BILLING_TYPE ?? "BOLETO", value, dueDate:dueDate(invoice.vencimento), description:`Andrade Energy · ${invoice.referencia ?? "fatura"}`, externalReference:faturaId }) });
  const pix = await asaasRequest<any>(`/payments/${payment.id}/pixQrCode`).catch(()=>null);
  const record = { fatura_id:faturaId, asaas_customer_id:customer.id, asaas_payment_id:payment.id, status:payment.status, valor:value, invoice_url:payment.invoiceUrl??null, bank_slip_url:payment.bankSlipUrl??null, linha_digitavel:payment.identificationField??null, codigo_pix:pix?.payload??null, atualizado_em:new Date().toISOString() };
  const { data, error: saveError } = await supabase.from("asaas_cobrancas").upsert(record,{onConflict:"fatura_id"}).select().single(); if(saveError) throw saveError;
  await supabase.from("faturas").update({ linha_digitavel:record.linha_digitavel, codigo_pix:record.codigo_pix, pdf_boleto_url:record.bank_slip_url }).eq("id",faturaId);
  return data;
}

async function transferirSaldo(cobranca: any) {
  if (process.env.ASAAS_AUTO_TRANSFER_ENABLED !== "true") return null;
  const key=process.env.ASAAS_TRANSFER_PIX_KEY; const keyType=process.env.ASAAS_TRANSFER_PIX_KEY_TYPE;
  if(!key||!keyType) throw new Error("Destino Pix não configurado.");
  const already=await supabase.from("asaas_transferencias").select("*").eq("cobranca_id",cobranca.id).maybeSingle(); if(already.data) return already.data;
  const value=Math.max(0,Number(cobranca.valor)-Number(process.env.ASAAS_TRANSFER_RESERVE_VALUE??0)); if(!(value>0)) throw new Error("Valor líquido inválido.");
  const transfer=await asaasRequest<any>("/transfers",{method:"POST",body:JSON.stringify({value,pixAddressKey:key,pixAddressKeyType:keyType,operationType:"PIX",description:`Repasse Andrade ${cobranca.fatura_id}`})});
  return (await supabase.from("asaas_transferencias").insert({cobranca_id:cobranca.id,asaas_transfer_id:transfer.id,valor:value,status:transfer.status,destino_mascarado:`${keyType}:***${key.slice(-4)}`}).select().single()).data;
}

export async function processarWebhookAsaas(body: any, token?: string) {
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) throw new Error("Webhook Asaas não autorizado.");
  if (!body?.id || !body?.event) throw new Error("Evento Asaas inválido.");
  const inserted=await supabase.from("asaas_eventos").insert({evento_id:body.id,tipo:body.event,payload:body}).select().single(); if(inserted.error?.code==="23505") return {duplicado:true}; if(inserted.error) throw inserted.error;
  if(body.payment?.id){ const {data:c}=await supabase.from("asaas_cobrancas").update({status:body.payment.status,atualizado_em:new Date().toISOString()}).eq("asaas_payment_id",body.payment.id).select().maybeSingle(); if(c&&["PAYMENT_RECEIVED","PAYMENT_CONFIRMED"].includes(body.event)){ await supabase.from("faturas").update({status:"PAGO"}).eq("id",c.fatura_id); await transferirSaldo(c); } }
  if(body.transfer?.id) await supabase.from("asaas_transferencias").update({status:body.transfer.status,atualizado_em:new Date().toISOString()}).eq("asaas_transfer_id",body.transfer.id);
  return {recebido:true};
}
