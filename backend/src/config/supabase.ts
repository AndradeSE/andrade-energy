import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

console.log("==================================");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log(
  "SERVICE_KEY:",
  process.env.SUPABASE_SERVICE_KEY?.substring(0, 25) + "..."
);
console.log("==================================");

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL não encontrada");
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_SERVICE_KEY não encontrada");
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);