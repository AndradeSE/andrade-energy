export function emailOAuthState(randomState: string, origin: unknown) {
  return origin === "WEB" ? `web_${randomState}` : randomState;
}
export function emailWebReturn(state: string, status: string, backendOrigin: string) {
  if (!/^web_[A-Za-z0-9_-]{43}$/.test(state)) return null;
  const url = new URL("/api/oauth/email/retorno-web", backendOrigin);
  url.searchParams.set("status", ["SUCESSO", "AUTORIZADO", "CONCLUIDO"].includes(status) ? "AUTORIZADO" : "ERRO");
  return url.toString();
}
