export type ContingencyEnvironment = "preview" | "production";

export function contingencyEnvironment(env: NodeJS.ProcessEnv): ContingencyEnvironment | null {
  if(env.API_RUNTIME!=="serverless" || env.BACKGROUND_JOBS_ENABLED!=="false") return null;
  const db=String(env.SUPABASE_URL??"").replace(/\/$/,"");
  if(env.CONTINGENCY_ENVIRONMENT==="production" && env.NETLIFY_PRODUCTION_ENABLED==="true" &&
    db==="https://ehnkyrsseisvvtbkwrvu.supabase.co") return "production";
  if(env.CONTINGENCY_ENVIRONMENT==="preview" && env.NETLIFY_FULL_VALIDATION_ENABLED==="true" &&
    db==="https://qqhcjieymypowunkixmk.supabase.co") return "preview";
  return null;
}

/** Never derive a private request destination from caller input. */
export function primaryApiOrigin(environment: ContingencyEnvironment) {
  return environment==="production" ? "https://andrade-energy-api-vda.onrender.com" : "https://andrade-energy-api-homologacao.onrender.com";
}

export function executorApiOrigin(environment: ContingencyEnvironment, executor: string) {
  if (executor === 'RENDER') return primaryApiOrigin(environment);
  if (executor === 'RENDER_RESERVA') return environment === 'production'
    ? 'https://andrade-energy-api-reserva-producao.onrender.com' : 'https://andrade-energy-api-reserva-preview.onrender.com';
  if (executor === 'NETLIFY') return environment === 'production'
    ? 'https://andrade-energy-api-reserva.netlify.app' : 'https://andrade-energy-fallback-probe.netlify.app';
  throw new Error('Executor inválido.');
}
