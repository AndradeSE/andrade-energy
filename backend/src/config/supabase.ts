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
export let supabase = sourceSupabase;

// Called only after the Preview recovery runtime validates its private snapshot.
export function installRecoveryClient(client: typeof supabase) {
  const previous = supabase;
  supabase = client;
  return () => { supabase = previous; };
}
