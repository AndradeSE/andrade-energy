import assert from "node:assert/strict";
import { test } from "node:test";
import { PostgresRateLimitStore } from "./distributedRateLimit";

test("separate instances share opaque keys and refuse unavailable or corrupt counters", async () => {
  const rows = new Map<string, number>();
  const rpc = async (_name: string, args: Record<string, unknown>) => {
    const key = String(args.p_chave);
    assert.match(key, /^[0-9a-f]{64}$/);
    const total = (rows.get(key) ?? 0) + 1;
    rows.set(key, total);
    return { data: [{ total, reinicia_em: "2026-10-23T03:00:00Z" }], error: null };
  };
  const one = new PostgresRateLimitStore("login", rpc);
  const two = new PostgresRateLimitStore("login", rpc);
  assert.equal((await one.increment("203.0.113.9")).totalHits, 1);
  assert.equal((await two.increment("203.0.113.9")).totalHits, 2);
  assert.equal((await new PostgresRateLimitStore("session", rpc).increment("203.0.113.9")).totalHits, 1);
  for (const result of [{ data: null, error: { message: "offline" } }, { data: [{ total: "1", reinicia_em: "bad" }], error: null }]) {
    await assert.rejects(new PostgresRateLimitStore("login", async () => result).increment("203.0.113.9"));
  }
});
