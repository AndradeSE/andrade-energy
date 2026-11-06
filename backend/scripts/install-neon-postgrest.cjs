const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  if (process.env.NEON_API_ENABLED !== "true") return;
  if (process.arch !== "x64" || !["linux", "win32"].includes(process.platform)) {
    throw new Error("Plataforma PostgREST não validada");
  }
  const windows = process.platform === "win32";
  const archive = windows ? "postgrest-v16.5-windows-x86-64.zip" : "postgrest-v16.5-linux-static-x86-64.tar.xz";
  const digest = windows ? "17f595b0d8dd37473d0231417dea07c5ac9f791282ff5b017fae51ff29e5de2f"
    : "5099e7ada38f9f6846cd87c14c5f158b7c165f1e9959665ad412e61f4dceba95";
  const destination = path.resolve(__dirname, "../.runtime/postgrest-v16.5");
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  const response = await fetch(`https://github.com/PostgREST/postgrest/releases/download/v16.5/${archive}`,
    { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error("Download oficial PostgREST indisponível");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 25 * 1024 * 1024 || createHash("sha256").update(bytes).digest("hex") !== digest) {
    throw new Error("Arquivo PostgREST não confere com o SHA-256 fixado");
  }
  const file = path.join(destination, archive);
  try {
    await fs.writeFile(file, bytes, { mode: 0o600 });
    execFileSync("tar", ["-xf", file, "-C", destination], { stdio: "pipe" });
    const executable = path.join(destination, windows ? "postgrest.exe" : "postgrest");
    if (!windows) await fs.chmod(executable, 0o700);
    const version = execFileSync(executable, ["--version"], { encoding: "utf8" });
    if (!/PostgREST 16\.5\b/.test(version)) throw new Error("Versão PostgREST inesperada");
    console.log("PostgREST 16.5 oficial verificado para o Neon Preview.");
  } finally { await fs.unlink(file).catch(() => {}); }
}

main().catch(() => { console.error("Não foi possível preparar a API privada Neon Preview."); process.exitCode = 1; });
