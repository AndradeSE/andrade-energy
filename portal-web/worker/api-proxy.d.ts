export function proxyApi(request: Request, env?: { ANDRADE_API_ORIGIN?: string }, upstreamFetch?: typeof fetch): Promise<Response>;
