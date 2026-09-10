import { asaasComercialConfigurado } from "./asaasComercial.client";
import { mercadoPagoComercialConfigurado } from "./mercadoPagoComercial.client";

export type ProvedorPagamentoComercial = "MERCADO_PAGO" | "ASAAS";

export function provedorPagamentoComercial(): ProvedorPagamentoComercial {
  const preferido = String(process.env.COMERCIAL_PAYMENT_PROVIDER ?? "MERCADO_PAGO").toUpperCase();
  if (preferido === "MERCADO_PAGO" && mercadoPagoComercialConfigurado()) return "MERCADO_PAGO";
  if (preferido === "ASAAS" && asaasComercialConfigurado()) return "ASAAS";
  if (mercadoPagoComercialConfigurado()) return "MERCADO_PAGO";
  if (asaasComercialConfigurado()) return "ASAAS";
  throw new Error("Nenhum provedor de pagamento comercial está configurado.");
}

