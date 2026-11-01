import { contingencyCommit, contingencyExecutor } from './contingencyExecutor';
import { primaryApiOrigin } from './contingencyRuntime';

export function primaryEnvironment(env: NodeJS.ProcessEnv): 'preview' | 'production' | null {
  if (env.API_RUNTIME === 'serverless' || env.CONTINGENCY_EXECUTOR ||
      env.CONTINGENCY_ROUTING_ENABLED !== 'true' || env.DURABLE_SCHEDULER_ENABLED !== 'true' ||
      env.BACKGROUND_JOBS_ENABLED === 'false') return null;
  const db = String(env.SUPABASE_URL ?? '').replace(/\/$/, '');
  if (db === 'https://qqhcjieymypowunkixmk.supabase.co') return 'preview';
  if (db === 'https://ehnkyrsseisvvtbkwrvu.supabase.co') return 'production';
  return null;
}

export function primaryReadyForReturn(env: NodeJS.ProcessEnv, control: any): boolean {
  const commit = contingencyCommit(env);
  return !!primaryEnvironment(env) && /^[a-f0-9]{40}$/.test(commit ?? '') &&
    control?.render_reserva_commit_validado === commit && !!control?.render_reserva_validado_em;
}

/** Runs on the recovered primary, independently of the reserve and job ownership. */
export async function observePrimaryReturn(env: NodeJS.ProcessEnv, store: any, request: typeof fetch = fetch) {
  const environment = primaryEnvironment(env);
  if (!environment || contingencyExecutor(env) !== 'RENDER') return;
  const { data, error } = await store.from('contingencia_automacao')
    .select('ativa,retorno_automatico').eq('id', true).single();
  if (error || !data?.ativa || !data?.retorno_automatico) return;
  const control = await store.from('contingencia_controle').select('executor').eq('id', true).single();
  if (control.error) return;
  // Once ownership has returned, avoid self-pinging the free service forever.
  if (control.data?.executor === 'RENDER') return 'PRINCIPAL_ATIVO';
  let healthy = false;
  try {
    const response = await request(`${primaryApiOrigin(environment)}/health`, {
      redirect: 'error', signal: AbortSignal.timeout(8000), headers: { 'Cache-Control': 'no-cache' },
    });
    const body: any = response.ok ? await response.json() : null;
    healthy = body?.status === 'online' && body?.environment === environment &&
      body?.releaseCommit === contingencyCommit(env) && body?.contingency?.executor === 'RENDER' &&
      body?.contingency?.readyForReturn === true;
  } catch { /* Reset consecutive observations; never force a switch on a timeout. */ }
  const result = await store.rpc('observar_retorno_render', {
    p_servico: environment === 'preview' ? 'srv-das0mmfpn0mc73ec00hg' : 'srv-da0iso5bedkc73asecig',
    p_saudavel: healthy, p_commit: contingencyCommit(env),
  });
  if (result.error) throw new Error('Não foi possível conferir o retorno automático ao principal.');
  return result.data;
}
