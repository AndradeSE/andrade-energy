const baseUrl = process.env.ASAAS_API_URL ?? "https://api-sandbox.asaas.com/v3";

export async function asaasRequest<T>(path: string, init: RequestInit = {}) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada.");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { accept: "application/json", access_token: apiKey, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as any)?.errors?.[0]?.description ?? (data as any)?.message ?? `Asaas respondeu ${response.status}.`);
  return data as T;
}

