const tagplusCallbackScript = `
(() => {
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname);
  const status = document.getElementById('status');
  const open = document.getElementById('open');
  const state = params.get('state');
  const token = params.get('access_token');
  if (params.has('error')) {
    status.textContent = 'A autorização foi recusada. Volte ao Andrade Tools e tente novamente.';
    return;
  }
  if (params.getAll('state').length !== 1 || !/^[a-f0-9]{64}$/.test(state || '') ||
      params.getAll('access_token').length !== 1 || !token || token.length > 16384 || /\\s/.test(token) ||
      params.get('token_type')?.toLowerCase() !== 'bearer') {
    status.textContent = 'Nenhuma autorização válida recebida. Inicie a conexão em Configurações no Andrade Tools.';
    return;
  }
  const handoff = new URLSearchParams({ state, access_token: token, token_type: 'bearer' });
  open.href = 'andrade-tools://oauth/tagplus/callback#' + handoff.toString();
  open.hidden = false;
  status.textContent = 'Autorização recebida. Clique abaixo para voltar ao programa e validar a conexão.';
  open.addEventListener('click', () => {
    status.textContent = 'Confirme a abertura do Andrade Tools no navegador. O programa verificará a conexão.';
  });
  setTimeout(() => {
    open.removeAttribute('href'); open.hidden = true;
    status.textContent = 'Este retorno expirou. Inicie uma nova conexão no Andrade Tools.';
  }, 300000);
})();
`;

function tagplusCallback(request) {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; script-src 'nonce-" + nonce + "'; style-src 'nonce-" + nonce + "'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  };
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Método não permitido', { status: 405, headers: { ...headers, Allow: 'GET, HEAD' } });
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Conectar TagPlus — Andrade Tools</title><style nonce="${nonce}">body{margin:0;background:#f4f6f8;color:#172033;font:16px/1.6 system-ui,sans-serif;display:grid;min-height:100vh;place-items:center}main{max-width:520px;margin:24px;padding:36px;background:white;border-radius:16px;box-shadow:0 4px 24px #17203312}h1{font-size:26px;margin:0 0 16px}.brand{font-weight:700;color:#1f6feb}a{display:inline-block;margin-top:12px;padding:12px 20px;background:#1f6feb;color:white;border-radius:8px;text-decoration:none}a[hidden]{display:none}a:focus-visible{outline:3px solid #172033;outline-offset:4px}</style></head><body><main><p class="brand">Andrade Tools</p><h1>Conexão com o TagPlus</h1><p id="status" role="status">Preparando retorno ao programa…</p><a id="open" hidden>Voltar ao Andrade Tools</a><noscript>Ative o JavaScript para retornar ao programa.</noscript></main><script nonce="${nonce}">${tagplusCallbackScript}</script></body></html>`;
  return new Response(request.method === 'HEAD' ? null : html, { headers });
}

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === "/oauth/tagplus/callback") return tagplusCallback(request);
    const downloads = {
      "/downloads/andrade-energy-gerador.apk": "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-gerador.apk",
      "/downloads/andrade-energy-consumidor.apk": "https://github.com/AndradeSE/andrade-energy/releases/download/apps-2026-08-27/andrade-energy-consumidor.apk",
    };
    const downloadUrl = downloads[requestUrl.pathname];
    if ((request.method === "GET" || request.method === "HEAD") && downloadUrl) {
      return Response.redirect(downloadUrl, 302);
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== "GET") {
      if (request.method === "GET" && (requestUrl.pathname === "/" || response.headers.get("content-type")?.includes("text/html"))) {
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
        headers.set("Pragma", "no-cache");
        headers.delete("ETag");
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      }
      return response;
    }
    requestUrl.pathname = "/";
    const fallback = await env.ASSETS.fetch(new Request(requestUrl, request));
    const headers = new Headers(fallback.headers);
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.delete("ETag");
    return new Response(fallback.body, { status: fallback.status, statusText: fallback.statusText, headers });
  },
};

