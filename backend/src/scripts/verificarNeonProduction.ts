import { Client } from "pg";

async function main() {
  const raw = process.env.NEON_DATABASE_URL;
  if (!raw && process.argv.includes("--if-configured")) return;
  if (!raw) throw new Error("NEON_DATABASE_URL ausente");
  const url = new URL(raw.trim());
  if (!["postgresql:", "postgres:"].includes(url.protocol)) throw new Error("Formato da URL Neon inválido");
  if (!/^ep-cold-voice-berwue3b(?:-pooler)?\.c-9\.us-east-2\.aws\.neon\.tech$/.test(url.hostname) ||
      (url.port && url.port !== "5432")) throw new Error("Endpoint diferente do Neon Production");
  if (!/^\/(neondb|andrade_production_restore_[a-z0-9_]+)$/.test(url.pathname)) throw new Error("Banco diferente do Neon Production");
  if (!url.username || !url.password) throw new Error("Usuário ou senha ausente na URL Neon");
  const client = new Client({
    host: url.hostname,
    port: 5432,
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, servername: url.hostname },
    connectionTimeoutMillis: 8000,
    statement_timeout: 8000,
  });
  try {
    await client.connect();
    const { rows: [estado] } = await client.query(
      "select current_database() as banco, count(*)::int as tabelas, count(*) filter (where relrowsecurity)::int as rls from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
    );
    if (!estado.tabelas || estado.tabelas !== estado.rls) throw new Error("Estrutura do reserva incompleta");
    console.log("Conexão Neon Production verificada", JSON.stringify(estado));
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const code = (error as { code?: unknown })?.code;
  const knownCodes = ["28P01", "28000", "3D000", "ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "ERR_TLS_CERT_ALTNAME_INVALID"];
  const reason = typeof code === "string" && knownCodes.includes(code) ? code
    : error instanceof Error && ["Formato da URL Neon inválido", "Endpoint diferente do Neon Production", "Banco diferente do Neon Production", "Usuário ou senha ausente na URL Neon", "Estrutura do reserva incompleta", "NEON_DATABASE_URL ausente"].includes(error.message)
      ? error.message : "conexão ou consulta falhou";
  console.error("Verificação do Neon falhou:", reason);
  process.exitCode = 1;
});
