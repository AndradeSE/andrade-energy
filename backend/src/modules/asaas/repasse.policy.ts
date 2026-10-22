import { AsaasHttpError } from "./asaas.client";

export const pagamentoDisponivelParaRepasse = (status: unknown) => String(status ?? "").toUpperCase() === "RECEIVED";

// Timeout/5xx podem ocorrer após o provedor aceitar o Pix. Nunca liberar
// automaticamente o valor para uma segunda transferência nesses casos.
export function falhaRepasse(error: unknown) {
  const rejeitado = error instanceof AsaasHttpError && [400, 401, 403, 404, 422, 429].includes(error.status);
  return {
    status: rejeitado ? "REFUSED" : "UNKNOWN",
    erro_codigo: error instanceof AsaasHttpError ? error.providerCode.slice(0, 120) : "RESULTADO_NAO_CONFIRMADO",
  };
}
