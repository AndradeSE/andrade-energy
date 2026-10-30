import crypto from "node:crypto";

const baseUrl = process.env.MERCADO_PAGO_API_URL ?? "https://api.mercadopago.com";

export function mercadoPagoComercialConfigurado() {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

export async function mercadoPagoComercialRequest<T>(path: string, init: RequestInit = {}) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Configure a credencial do Mercado Pago das assinaturas antes de iniciar o checkout.");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as any)?.message ?? (data as any)?.error ?? "operação não concluída";
    throw new Error(`Mercado Pago HTTP ${response.status}: ${message}.`);
  }
  return data as T;
}

export function validarAssinaturaWebhookMercadoPago(input: {
  xSignature?: string;
  xRequestId?: string;
  dataId?: string;
  secret?: string;
}) {
  const secret = input.secret ?? process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret || !input.xSignature || !input.xRequestId || !input.dataId) return false;
  const partes = Object.fromEntries(
    input.xSignature.split(",").map((parte) => parte.trim().split("=", 2)),
  );
  if (!partes.ts || !partes.v1) return false;
  const manifest = `id:${String(input.dataId).toLowerCase()};request-id:${input.xRequestId};ts:${partes.ts};`;
  const esperado = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const recebido = String(partes.v1);
  return esperado.length === recebido.length && crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));
}

