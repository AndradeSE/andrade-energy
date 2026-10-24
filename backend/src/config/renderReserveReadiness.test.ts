import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReserveReady } from './renderReserveReadiness';
const env = { CONTINGENCY_EXECUTOR:'RENDER_RESERVA', CONTINGENCY_ENVIRONMENT:'preview',
  SUPABASE_URL:'https://qqhcjieymypowunkixmk.supabase.co', CONTINGENCY_ROUTING_ENABLED:'true',
  BACKGROUND_JOBS_ENABLED:'true', DURABLE_SCHEDULER_ENABLED:'true', RENDER_GIT_COMMIT:'a'.repeat(40) };
test('only the approved deployed reserve with durable queues can be advertised', () => {
  const control={render_reserva_commit_validado:env.RENDER_GIT_COMMIT,render_reserva_validado_em:'2026-10-24'};
  assert.equal(renderReserveReady(env,control),true);
  for(const change of [{render_reserva_commit_validado:'b'.repeat(40)},{render_reserva_validado_em:null}])
    assert.equal(renderReserveReady(env,{...control,...change}),false);
  assert.equal(renderReserveReady({...env,BACKGROUND_JOBS_ENABLED:'false'},control),false);
  assert.equal(renderReserveReady({...env,RENDER_GIT_COMMIT:undefined},control),false);
});
