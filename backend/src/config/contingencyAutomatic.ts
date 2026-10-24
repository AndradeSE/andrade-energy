import { contingencyEnvironment, primaryApiOrigin } from './contingencyRuntime';
import { contingencyCommit, contingencyExecutor } from './contingencyExecutor';

type RenderState = 'ATIVO' | 'BILLING' | 'OUTRA_SUSPENSAO' | 'INDETERMINADO';
const services = { preview: 'srv-das0mmfpn0mc73ec00hg', production: 'srv-da0iso5bedkc73asecig' } as const;
export function classifyRenderService(body: any, environment: 'preview' | 'production'): RenderState {
  if (body?.id !== services[environment] || body?.type !== 'web_service' ||
      body?.serviceDetails?.url !== primaryApiOrigin(environment) || body?.serviceDetails?.plan !== 'free' ||
      !Array.isArray(body?.suspenders)) return 'INDETERMINADO';
  if (body.suspended === 'not_suspended' && body.suspenders.length === 0) return 'ATIVO';
  if (body.suspended !== 'suspended') return 'INDETERMINADO';
  return body.suspenders.length === 1 && body.suspenders[0] === 'billing' ? 'BILLING' : 'OUTRA_SUSPENSAO';
}

/** Independent of Render and of the current executor. No provider mutations or financial retries. */
export async function observeRenderForContingency(env: NodeJS.ProcessEnv, store: any, request: typeof fetch = fetch) {
  const renderReserve=env.CONTINGENCY_EXECUTOR==='RENDER_RESERVA' && contingencyExecutor(env)==='RENDER_RESERVA';
  const environment = renderReserve?'preview':contingencyEnvironment(env);
  if (!environment || (!renderReserve && env.NETLIFY_DURABLE_JOBS_ENABLED !== 'true')) return;
  const { data: configuration, error } = await store.from('contingencia_automacao').select('ativa,render_service_id').eq('id', true).single();
  if (error) throw new Error('Não foi possível consultar a automação do reserva.');
  if (!configuration?.ativa) return;
  if (configuration.render_service_id !== services[environment]) throw new Error('Serviço de monitoramento não corresponde ao ambiente.');
  let state: RenderState = 'INDETERMINADO';
  const key = String(env.RENDER_MONITOR_API_KEY ?? '').trim();
  if (key) {
    try {
      const response = await request(`https://api.render.com/v1/services/${services[environment]}`, {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(6000),
      });
      if (response.ok) state = classifyRenderService(await response.json(), environment);
    } catch { /* Unavailability is not evidence of billing suspension. */ }
  }
  const result = await store.rpc(renderReserve?'observar_render_reserva_contingencia':'observar_render_contingencia', {
    p_servico: services[environment], p_estado: state, p_commit: contingencyCommit(env),
  });
  if (result.error) throw new Error('A observação do reserva não pôde ser registrada.');
  return result.data;
}
