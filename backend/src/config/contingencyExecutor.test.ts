import test from 'node:test';
import assert from 'node:assert/strict';
import { contingencyExecutor, contingencyCommit } from './contingencyExecutor';

const pilot = {
  CONTINGENCY_EXECUTOR: 'RENDER_RESERVA', CONTINGENCY_ENVIRONMENT: 'preview',
  SUPABASE_URL: 'https://qqhcjieymypowunkixmk.supabase.co',
  CONTINGENCY_ROUTING_ENABLED: 'true', BACKGROUND_JOBS_ENABLED: 'false', CEMIG_CLOUD_ENABLED: 'false',
};
test('existing primary and serverless retain separate identities', () => {
  assert.equal(contingencyExecutor({}), 'RENDER');
  assert.equal(contingencyExecutor({ API_RUNTIME: 'serverless' }), 'NETLIFY');
  assert.equal(contingencyExecutor(pilot), 'RENDER_RESERVA');
});
test('reserve refuses production, unfenced writes, timers, and cloud simulation', () => {
  for (const change of [
    { SUPABASE_URL: 'https://ehnkyrsseisvvtbkwrvu.supabase.co' },
    { CONTINGENCY_ENVIRONMENT: 'production' }, { API_RUNTIME: 'serverless' },
    { CONTINGENCY_ROUTING_ENABLED: 'false' }, { BACKGROUND_JOBS_ENABLED: 'true' },
    { BACKGROUND_JOBS_ENABLED: undefined }, { CEMIG_CLOUD_ENABLED: 'true' },
    { CONTINGENCY_EXECUTOR: 'RENDER' }, { CONTINGENCY_EXECUTOR: '' },
  ]) assert.throws(() => contingencyExecutor({ ...pilot, ...change }));
});
test('ownership compares the actual Render deployment commit', () => {
  assert.equal(contingencyCommit({ RENDER_GIT_COMMIT: 'render', COMMIT_REF: 'netlify' }), 'render');
  assert.equal(contingencyCommit({ COMMIT_REF: 'netlify' }), 'netlify');
  assert.equal(contingencyCommit({}), null);
});
