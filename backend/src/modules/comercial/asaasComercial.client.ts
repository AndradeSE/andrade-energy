const SANDBOX_URL = "https://api-sandbox.asaas.com/v3";
const PRODUCTION_URL = "https://api.asaas.com/v3";

function resolveAsaasComercialBaseUrl(apiKey: string) {
  if (apiKey.startsWith("$aact_prod_")) return PRODUCTION_URL;
  if (apiKey.startsWith("$aact_hmlg_")) return SANDBOX_URL;
  return process.env.ASAAS_COMERCIAL_API_URL ?? process.env.ASAAS_API_URL ?? SANDBOX_URL;
}

export function asaasComercialConfigurado() {
  return Boolean(process.env.ASAAS_COMERCIAL_API_KEY);
}

export async function asaasComercialRequest<T>(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_COMERCIAL_API_KEY;
  if (!apiKey) throw new Error("Configure a conta Asaas exclusiva das assinaturas antes de movimentar este financeiro.");
  const baseUrl = resolveAsaasComercialBaseUrl(apiKey);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { accept:"application/json", access_token:apiKey, "Content-Type":"application/json", "User-Agent":"AndradeEnergy/1.0", ...(init.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError = (data as any)?.errors?.[0];
    throw new Error(`Asaas comercial HTTP ${response.status}: ${providerError?.description ?? (data as any)?.message ?? "operação não concluída"}.`);
  }
  return data as T;
}
