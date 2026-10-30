const COOKIE = "__Secure-andrade_web_session";
const SESSION_MARKER = "cookie-session";
const UPSTREAMS = new Set(["https://andrade-energy-api-vda.onrender.com", "https://andrade-energy-api-homologacao.onrender.com"]);
const TOKEN = /^[a-f0-9]{64}$/;
function json(data, status = 200, cookie) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (cookie) headers["Set-Cookie"] = cookie;
  return new Response(JSON.stringify(data), { status, headers });
}
function cookieFor(token, maxAge = 30 * 86400) {
  return `${COOKIE}=${token}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function sessionToken(request) {
  const matches = (request.headers.get("Cookie") ?? "").split(";").map(part => part.trim()).filter(part => part.startsWith(`${COOKIE}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(COOKIE.length + 1);
  return TOKEN.test(token) ? token : null;
}
export async function proxyApi(request, env = {}, upstreamFetch = fetch) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if ((origin && origin !== url.origin) || request.headers.get("Sec-Fetch-Site") === "cross-site") return json({ message: "Origem não autorizada." }, 403);
  if (!["GET", "HEAD"].includes(request.method) && origin !== url.origin) return json({ message: "Origem necessária para esta operação." }, 403);
  const upstreamOrigin = env.ANDRADE_API_ORIGIN ?? "https://andrade-energy-api-vda.onrender.com";
  if (!UPSTREAMS.has(upstreamOrigin)) return json({ message: "Servidor do portal não configurado." }, 503);
  let token = sessionToken(request);
  const sessionBridge = url.pathname === "/api/auth/session";
  if (sessionBridge) {
    if (request.method !== "POST") return json({ message: "Método não permitido." }, 405);
    try {
      const text = await request.text();
      if (text.length > 4096) return json({ message: "Solicitação inválida." }, 400);
      const body = JSON.parse(text || "{}");
      if (!token && TOKEN.test(body.legacyToken ?? "")) token = body.legacyToken;
    } catch { return json({ message: "Solicitação inválida." }, 400); }
    if (!token) return json({ message: "Entre para continuar." }, 401);
  }
  const headers = new Headers();
  for (const name of ["Content-Type", "Accept", "Idempotency-Key", "X-Adesao-Chave"]) { const value = request.headers.get(name); if (value) headers.set(name, value); }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const upstreamUrl = new URL(sessionBridge ? "/api/auth/session" : url.pathname + url.search, upstreamOrigin);
  let response;
  try {
    response = await upstreamFetch(upstreamUrl, { method: sessionBridge ? "GET" : request.method, headers, body: sessionBridge || ["GET", "HEAD"].includes(request.method) ? undefined : request.body, redirect: "manual", signal: AbortSignal.timeout(60_000), ...(request.body && !sessionBridge ? { duplex: "half" } : {}) });
  } catch { return json({ message: "O servidor está indisponível. Tente novamente." }, 502, url.pathname === "/api/auth/logout" ? cookieFor("", 0) : undefined); }
  if (url.pathname === "/api/auth/logout") {
    // Mesmo com falha de rede, o navegador encerra seu acesso local.
    return json({ message: response.ok ? "Sessão encerrada." : "Acesso local encerrado. Não foi possível confirmar a revogação no servidor." }, response.ok ? 200 : response.status, cookieFor("", 0));
  }
  if (response.status === 401 && token) return new Response(response.body, { status: 401, headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store", "Set-Cookie": cookieFor("", 0) } });
  if (sessionBridge || url.pathname === "/api/auth/login") {
    const data = await response.json().catch(() => null);
    if (!response.ok) return json(data ?? { message: "Não foi possível entrar." }, response.status);
    const authenticated = sessionBridge ? token : data?.token;
    if (!TOKEN.test(authenticated ?? "")) return json({ message: "Resposta de autenticação inválida." }, 502);
    if (sessionBridge && (!data?.usuario || typeof data.usuario.id !== "string")) return json({ message: "Resposta de sessão inválida." }, 502);
    const safeData = sessionBridge ? { usuario: data.usuario, token: SESSION_MARKER } : { ...data, token: SESSION_MARKER };
    return json(safeData, 200, cookieFor(authenticated));
  }
  const responseHeaders = new Headers();
  for (const name of ["Content-Type", "Content-Disposition", "Location", "Retry-After"]) { const value = response.headers.get(name); if (value) responseHeaders.set(name, value); }
  responseHeaders.set("Cache-Control", "no-store"); responseHeaders.set("X-Content-Type-Options", "nosniff");
  if (token && response.ok) responseHeaders.set("Set-Cookie", cookieFor(token));
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}
