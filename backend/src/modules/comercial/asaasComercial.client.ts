const baseUrl = process.env.ASAAS_COMERCIAL_API_URL ?? process.env.ASAAS_API_URL ?? "https://api-sandbox.asaas.com/v3";

export function asaasComercialConfigurado() {
  return Boolean(process.env.ASAAS_COMERCIAL_API_KEY);
}

export async function asaasComercialRequest<T>(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_COMERCIAL_API_KEY;
  if (!apiKey) throw new Error("Configure a conta Asaas exclusiva das assinaturas antes de movimentar este financeiro.");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { accept:"application/json", access_token:apiKey, "Content-Type":"application/json", ...(init.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError = (data as any)?.errors?.[0];
    throw new Error(`Asaas comercial HTTP ${response.status}: ${providerError?.description ?? (data as any)?.message ?? "operação não concluída"}.`);
  }
  return data as T;
}
