import { defineConfig, loadEnv, type Plugin } from "vite";
import { proxyApi } from "./worker/api-proxy.js";
import react from "@vitejs/plugin-react";
import { sites } from "@openai/sites-vite-plugin";

function localApiProxy(upstream: string): Plugin {
  return { name: "andrade-local-api", configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api/")) return next();
      try {
        const chunks: Buffer[] = []; let size = 0;
        for await (const chunk of req) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > 25 * 1024 * 1024) { res.statusCode = 413; res.end("Arquivo muito grande."); return; } chunks.push(bytes); }
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) { if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value); }
        const request = new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers, ...(["GET", "HEAD"].includes(req.method ?? "GET") ? {} : { body: Buffer.concat(chunks) }) });
        const response = await proxyApi(request, { ANDRADE_API_ORIGIN: upstream });
        res.statusCode = response.status; response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch { res.statusCode = 502; res.end("Não foi possível consultar o servidor."); }
    });
  } };
}
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const upstream = new URL(env.VITE_API_URL ?? "https://andrade-energy-api-vda.onrender.com/api").origin;
  return {
  plugins: [react(), sites(), localApiProxy(upstream)],
  publicDir: "public",
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
}; });
