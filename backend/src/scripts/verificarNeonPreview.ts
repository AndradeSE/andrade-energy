import { Client } from "pg";

async function main() {
  const raw = process.env.NEON_DATABASE_URL;
  if (!raw) throw new Error("NEON_DATABASE_URL ausente");
  const url = new URL(raw);
  if (url.protocol !== "postgresql:" ||
      url.hostname !== "ep-misty-star-beg2irkr.c-9.us-east-2.aws.neon.tech" ||
      (url.port && url.port !== "5432") ||
      !/^\/(neondb|andrade_preview_restore_[a-z0-9_]+)$/.test(url.pathname) ||
      !url.username || !url.password) {
    throw new Error("Destino Neon Preview inválido");
  }
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
    console.log(JSON.stringify(estado));
  } finally {
    await client.end();
  }
}

main().catch(() => {
  console.error("Verificação do Neon falhou. Confira o segredo, TLS e o banco de Preview.");
  process.exitCode = 1;
});
