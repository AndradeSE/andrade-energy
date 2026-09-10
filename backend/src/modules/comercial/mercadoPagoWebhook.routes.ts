import { Router } from "express";
import { validarAssinaturaWebhookMercadoPago } from "./mercadoPagoComercial.client";
import { processarWebhookMercadoPago } from "./mercadoPagoWebhook.service";

export const mercadoPagoWebhookRouter = Router();

mercadoPagoWebhookRouter.post("/", async (req, res) => {
  try {
    const dataId = String(req.query["data.id"] ?? req.body?.data?.id ?? "");
    const valido = validarAssinaturaWebhookMercadoPago({
      xSignature: req.header("x-signature") ?? undefined,
      xRequestId: req.header("x-request-id") ?? undefined,
      dataId,
    });
    if (!valido) return res.status(401).json({ message: "Webhook Mercado Pago não autorizado." });
    const tipo = String(req.query.type ?? req.body?.type ?? req.body?.topic ?? "");
    return res.json(await processarWebhookMercadoPago(tipo, dataId));
  } catch (error: any) {
    return res.status(400).json({ message: error?.message ?? "Webhook Mercado Pago inválido." });
  }
});

