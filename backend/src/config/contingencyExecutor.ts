export type ContingencyExecutor = 'RENDER' | 'NETLIFY' | 'RENDER_RESERVA';

/** Hosting runtime and ownership are separate: a second Render is never the primary. */
export function contingencyExecutor(env: NodeJS.ProcessEnv): ContingencyExecutor {
  const explicit = env.CONTINGENCY_EXECUTOR;
  if (explicit === undefined) return env.API_RUNTIME === 'serverless' ? 'NETLIFY' : 'RENDER';
  if (explicit !== 'RENDER_RESERVA') throw new Error('Identidade de contingência inválida.');
  // This pilot cannot be enabled against production by copying its environment.
  if (env.API_RUNTIME === 'serverless' || env.CONTINGENCY_ENVIRONMENT !== 'preview' ||
      String(env.SUPABASE_URL ?? '').replace(/\/$/, '') !== 'https://qqhcjieymypowunkixmk.supabase.co' ||
      env.CONTINGENCY_ROUTING_ENABLED !== 'true' ||
      !(env.BACKGROUND_JOBS_ENABLED === 'false' ||
        (env.BACKGROUND_JOBS_ENABLED === 'true' && env.DURABLE_SCHEDULER_ENABLED === 'true')) ||
      env.CEMIG_CLOUD_ENABLED === 'true') {
    throw new Error('Reserva Render exige Preview, controle de execução e filas desativadas ou duráveis.');
  }
  return 'RENDER_RESERVA';
}

export function contingencyCommit(env: NodeJS.ProcessEnv): string | null {
  return env.RENDER_GIT_COMMIT ?? env.COMMIT_REF ?? null;
}
