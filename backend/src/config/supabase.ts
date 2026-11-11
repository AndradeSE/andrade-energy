import { AsyncLocalStorage } from "node:async_hooks";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL não encontrada");
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_SERVICE_KEY não encontrada");
}

export const sourceSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const requestClient = new AsyncLocalStorage<typeof sourceSupabase>();
let defaultClient = sourceSupabase;

export const supabase = new Proxy(sourceSupabase, {
  get(_target, property) {
    const client = requestClient.getStore() ?? defaultClient;
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export function withRecoveryClient<T>(client: typeof sourceSupabase, handle: () => T) {
  return requestClient.run(client, handle);
}
export function installRecoveryClient(client: typeof supabase) {
  const previous = defaultClient;
  defaultClient = client;
  return () => { defaultClient = previous; };
}
