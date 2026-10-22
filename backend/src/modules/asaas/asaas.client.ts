const SANDBOX_URL = "https://api-sandbox.asaas.com/v3";
const PRODUCTION_URL = "https://api.asaas.com/v3";

export class AsaasHttpError extends Error {
  constructor(public status: number, public providerCode: string, public providerDescription: string) {
    super(`Asaas HTTP ${status}${providerCode ? ` (${providerCode})` : ""}: ${providerDescription}`);
  }
}

function resolveAsaasBaseUrl(apiKey: string) {
  // As chaves atuais do Asaas identificam o ambiente no próprio prefixo.
  // Isso evita combinar uma chave de produção com a URL de homologação.
  if (apiKey.startsWith("$aact_prod_")) return PRODUCTION_URL;
  if (apiKey.startsWith("$aact_hmlg_")) return SANDBOX_URL;
  return process.env.ASAAS_API_URL ?? SANDBOX_URL;
}

export async function asaasRequest<T>(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada.");
  const baseUrl = resolveAsaasBaseUrl(apiKey);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { accept: "application/json", access_token: apiKey, "Content-Type": "application/json", "User-Agent": "AndradeEnergy/1.0", ...(init.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError = (data as any)?.errors?.[0];
    const description = providerError?.description ?? (data as any)?.message ?? `Asaas respondeu ${response.status}.`;
    // A mensagem não contém token nem dados sensíveis. Ela é importante para
    // diferenciar uma falha de cadastro de uma indisponibilidade do provedor.
    throw new AsaasHttpError(response.status, String(providerError?.code ?? ""), String(description));
  }
  return data as T;
}

