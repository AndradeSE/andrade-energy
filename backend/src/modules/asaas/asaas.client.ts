const baseUrl = process.env.ASAAS_API_URL ?? "https://api-sandbox.asaas.com/v3";

export async function asaasRequest<T>(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada.");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { accept: "application/json", access_token: apiKey, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerError = (data as any)?.errors?.[0];
    const description = providerError?.description ?? (data as any)?.message ?? `Asaas respondeu ${response.status}.`;
    const code = providerError?.code ? ` (${providerError.code})` : "";
    // A mensagem não contém token nem dados sensíveis. Ela é importante para
    // diferenciar uma falha de cadastro de uma indisponibilidade do provedor.
    throw new Error(`Asaas HTTP ${response.status}${code}: ${description}`);
  }
  return data as T;
}

