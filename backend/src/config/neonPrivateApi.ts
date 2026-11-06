import { createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { neonPreviewConnection } from "./neonSnapshotRuntime";

async function availablePort() {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject); server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Porta local indisponível");
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}

export async function startNeonPrivateApi(env: NodeJS.ProcessEnv) {
  const connection = neonPreviewConnection(env);
  const url = new URL(env.NEON_DATABASE_URL!.trim());
  url.search = "";
  url.searchParams.set("sslmode", "verify-full");
  url.searchParams.set("sslrootcert", process.platform === "win32"
    ? "C:/Program Files/Git/mingw64/etc/ssl/certs/ca-bundle.crt" : "/etc/ssl/certs/ca-certificates.crt");
  const port = await availablePort();
  const secret = randomBytes(48).toString("base64url");
  const executable = path.resolve(__dirname, "../../.runtime/postgrest-v16.5", process.platform === "win32" ? "postgrest.exe" : "postgrest");
  const child = spawn(executable, [], { windowsHide: true, stdio: "ignore", env: {
    PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
    PGRST_DB_URI: url.href, PGRST_DB_SCHEMAS: "public", PGRST_DB_CONFIG: "false",
    PGRST_DB_POOL: "2", PGRST_DB_CHANNEL_ENABLED: "false", PGRST_JWT_SECRET: secret,
    PGRST_DB_TX_END: "rollback",
    PGRST_SERVER_HOST: "127.0.0.1", PGRST_SERVER_PORT: String(port), PGRST_LOG_LEVEL: "crit",
  } });
  let failure = false;
  child.once("error", () => { failure = true; });
  child.once("exit", () => { failure = true; });
  const stopAtExit = () => { child.kill(); };
  process.once("exit", stopAtExit);
  const stop = () => { process.removeListener("exit", stopAtExit); child.kill(); };
  const origin = `http://127.0.0.1:${port}`;
  const token = () => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const head = encode({ alg: "HS256", typ: "JWT" });
    const payload = encode({ role: connection.user, exp: Math.floor(Date.now() / 1000) + 60 });
    const content = `${head}.${payload}`;
    return `${content}.${createHmac("sha256", secret).update(content).digest("base64url")}`;
  };
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (failure) throw new Error("API privada Neon encerrou");
      try {
        const response = await fetch(`${origin}/clientes?select=id&limit=1`, {
          headers: { Authorization: `Bearer ${token()}` }, signal: AbortSignal.timeout(2000),
        });
        if (response.ok) { ready = true; break; }
      } catch { /* The child may still be loading its schema cache. */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error("API privada Neon não ficou pronta");
    const client = createClient(origin, "private-server-client", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: async (input, init) => {
        const request = new Request(input, init);
        const source = new URL(request.url);
        if (source.origin !== origin || !source.pathname.startsWith("/rest/v1/")) throw new Error("Destino REST inesperado");
        const readonlyRpc = source.pathname === "/rest/v1/rpc/consultar_tamanho_banco_cotas";
        if (source.pathname.startsWith('/rest/v1/rpc/') && !readonlyRpc) throw new Error('RPC não permitida na recuperação');
        if (!["GET", "HEAD"].includes(request.method) && !(request.method === "POST" && readonlyRpc)) {
          throw new Error("Escritas no reserva ainda estão bloqueadas");
        }
        source.pathname = source.pathname.slice("/rest/v1".length);
        const headers = new Headers(request.headers);
        headers.delete("apikey"); headers.set("Authorization", `Bearer ${token()}`);
        return fetch(source, { method: request.method, headers,
          body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
          signal: AbortSignal.timeout(15_000), redirect: "error" });
      } },
    });
    return { client, origin, stop };
  } catch (error) { stop(); throw error; }
}
