import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sites } from "@openai/sites-vite-plugin";

export default defineConfig({
  plugins: [react(), sites()],
  publicDir: "public",
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Local testing stays on homologation without weakening API CORS.
    proxy: { "/api": { target: "https://andrade-energy-api-homologacao.onrender.com", changeOrigin: true } },
  },
});
