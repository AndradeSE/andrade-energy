import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { validarAssinaturaWebhookMercadoPago } from "./mercadoPagoComercial.client";
import { provedorPagamentoComercial } from "./provedorPagamento";

test("prioriza Mercado Pago quando ambos estão configurados", () => {
  process.env.COMERCIAL_PAYMENT_PROVIDER = "MERCADO_PAGO";
  process.env.MERCADO_PAGO_ACCESS_TOKEN = "teste-mp";
  process.env.ASAAS_COMERCIAL_API_KEY = "teste-asaas";
  assert.equal(provedorPagamentoComercial(), "MERCADO_PAGO");
});

test("usa Asaas como fallback quando Mercado Pago não está configurado", () => {
  process.env.COMERCIAL_PAYMENT_PROVIDER = "MERCADO_PAGO";
  delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
  process.env.ASAAS_COMERCIAL_API_KEY = "teste-asaas";
  assert.equal(provedorPagamentoComercial(), "ASAAS");
});

test("valida assinatura HMAC do webhook Mercado Pago", () => {
  const secret = "segredo-teste";
  const dataId = "ABC123";
  const requestId = "req-1";
  const ts = "1704908010";
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  assert.equal(validarAssinaturaWebhookMercadoPago({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: requestId, dataId, secret }), true);
});

