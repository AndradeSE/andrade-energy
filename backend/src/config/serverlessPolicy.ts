export function homologationConfigured(env: NodeJS.ProcessEnv): boolean {
  return env.API_RUNTIME === "serverless" && env.BACKGROUND_JOBS_ENABLED === "false" &&
    env.NETLIFY_HOMOLOGATION_ENABLED === "true" &&
    /^https:\/\/qqhcjieymypowunkixmk\.supabase\.co\/?$/.test(env.SUPABASE_URL ?? "");
}

/** Staged homologation: financial writes and callbacks are never enabled by a flag. */
export function serverlessRequestAllowed(method: string, path: string, env: NodeJS.ProcessEnv): boolean {
  if (!["GET", "HEAD", "OPTIONS", "POST"].includes(method)) return false;
  // Some GETs consume tokens, OAuth state or mutate provider configuration.
  if (/^\/api\/(oauth|conexoes-email)(\/|$)/i.test(path)) return false;
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;
  return env.NETLIFY_AUTH_VALIDATION_ENABLED === "true" &&
    ["/api/auth/login", "/api/auth/logout", "/api/uploads/preparar", "/api/faturas/analisar", "/api/cotas-servicos/atualizar"].includes(path);
}
