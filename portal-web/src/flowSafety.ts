export function hasVerifiedSignature(contract: Record<string, any> | null | undefined): boolean {
  if (contract?.dados_documento?.aceite_cliente_exigido === true) return Boolean(contract.aceite_cliente_em);
  return Boolean(contract?.aceite_cliente_em || (contract?.contrato_assinado_url && (
    contract?.dados_documento?.assinatura_externa_validada_em
    || (contract?.status === "VIGENTE" && contract?.dados_documento?.assinatura_externa_pendente !== true))));
}

export function contractEndDate(date: string, years: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(years) || years < 1 || years > 100) return "";
  const value = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(value.getTime()) || value.toISOString().slice(0, 10) !== date) return "";
  const month = value.getUTCMonth();
  value.setUTCFullYear(value.getUTCFullYear() + years);
  if (value.getUTCMonth() !== month) value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}

export function checkoutKey(fragment: string, stored: string | null, fallback: string): string {
  let decoded = "";
  try { decoded = decodeURIComponent(fragment.replace(/^#/, "")); } catch {}
  return [decoded, stored].find(value => value && /^[a-zA-Z0-9_-]{16,200}$/.test(value)) ?? fallback;
}

export function safeRead(storage: Storage, key: string): string | null {
  try { return storage.getItem(key); } catch { return null; }
}

export function safeWrite(storage: Storage, key: string, value: string): boolean {
  try { storage.setItem(key, value); return true; } catch { return false; }
}

export function securePaymentUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("O provedor não informou um endereço de pagamento válido.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("O endereço de pagamento recebido não é seguro.");
  return url.href;
}

export function changedFields(form: Record<string, string>, initial: Record<string, string>, numeric: Set<string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(form).filter(([key, value]) => value !== initial[key]).map(([key, value]) => {
    if (!numeric.has(key)) return [key, value || null];
    if (!value.trim()) throw new Error("Preencha o campo numérico alterado; ele não será substituído por zero.");
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new Error("Informe um número válido e não negativo.");
    return [key, number];
  }));
}

export function safeRemove(storage: Storage, key: string): void {
  try { storage.removeItem(key); } catch {}
}

export function sessionAccessType(profile: unknown): "CONSUMIDOR" | "GERADOR" | null {
  if (profile === "LEITURA") return "CONSUMIDOR";
  if (profile === "ADMIN" || profile === "GESTOR") return "GERADOR";
  return null;
}

export function validWalletResponse(value: any): boolean {
  return value && ["saldoDisponivel", "saldoPendente", "totalRecebido", "totalTransferido"].every(key => typeof value[key] === "number" && Number.isFinite(value[key]))
    && (value.transferencias === undefined || Array.isArray(value.transferencias));
}
