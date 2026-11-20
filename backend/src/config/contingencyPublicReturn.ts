/** Static OAuth landing only: never exempt the callback or completion routes. */
export function isStaticOAuthReturn(method: string, path: string): boolean {
  return (method === "GET" || method === "HEAD") &&
    /^\/api\/oauth\/email\/retorno-web\/?$/.test(path);
}
