import { contingencyCommit, contingencyExecutor } from './contingencyExecutor';

export const RENDER_RESERVE_PREVIEW_ORIGIN = 'https://andrade-energy-api-reserva-preview.onrender.com';
export const RENDER_RESERVE_PRODUCTION_ORIGIN = 'https://andrade-energy-api-reserva-producao.onrender.com';

export function renderReserveReady(env: NodeJS.ProcessEnv, control: any): boolean {
  return contingencyExecutor(env) === 'RENDER_RESERVA' && env.BACKGROUND_JOBS_ENABLED === 'true' &&
    env.DURABLE_SCHEDULER_ENABLED === 'true' && /^[a-f0-9]{40}$/.test(contingencyCommit(env) ?? '') &&
    control?.render_reserva_commit_validado === contingencyCommit(env) &&
    Boolean(control?.render_reserva_validado_em);
}
