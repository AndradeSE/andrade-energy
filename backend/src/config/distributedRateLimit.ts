import { createHash } from "node:crypto";
import { rateLimit, type Options, type Store } from "express-rate-limit";

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: unknown }>;

/** Shared counters are mandatory on Functions; failure never permits a request. */
export class PostgresRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix: string;
  private windowMs = 60_000;
  constructor(scope: string, private rpc: Rpc) { this.prefix = `api:${scope}:`; }
  init(options: Options) { this.windowMs = options.windowMs; }
  private digest(key: string) { return createHash("sha256").update(this.prefix + key).digest("hex"); }
  async increment(key: string) {
    const { data, error } = await this.rpc("consumir_limite_api", {
      p_chave: this.digest(key), p_janela_ms: this.windowMs,
    });
    const row = Array.isArray(data) ? data[0] : data;
    const resetTime = new Date(row?.reinicia_em);
    if (error || !Number.isSafeInteger(row?.total) || row.total < 1 || !Number.isFinite(resetTime.getTime())) {
      throw new Error("Contador distribuído indisponível.");
    }
    return { totalHits: row.total, resetTime };
  }
  // No production limiter uses skipSuccessfulRequests/skipFailedRequests.
  async decrement(_key: string) { throw new Error("Decremento não habilitado para o contador distribuído."); }
  async resetKey(key: string) {
    const { error } = await this.rpc("reiniciar_limite_api", { p_chave: this.digest(key) });
    if (error) throw new Error("Não foi possível reiniciar o contador distribuído.");
  }
}

export function apiRateLimit(scope: string, options: Partial<Options>) {
  const distributed = process.env.API_RUNTIME === "serverless" || process.env.API_DISTRIBUTED_RATE_LIMIT === "true";
  const store = distributed ? new PostgresRateLimitStore(scope, async (name, args) => {
    const { supabase } = await import("./supabase.js");
    return supabase.rpc(name, args);
  }) : undefined;
  return rateLimit({ ...options, ...(store ? { store } : {}), passOnStoreError: false });
}
