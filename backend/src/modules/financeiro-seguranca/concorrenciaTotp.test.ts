import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

test('erros TOTP simultâneos contam até o bloqueio sem apagar o bloqueio', async () => {
  process.env.SUPABASE_URL ??= 'https://test.invalid';
  process.env.SUPABASE_SERVICE_KEY ??= 'test-placeholder';
  process.env.FINANCIAL_DATA_ENCRYPTION_KEY = 'unit-test-only-key';
  const { supabase } = await import('../../config/supabase.js');
  const { criptografarDado } = await import('../../utils/sensitiveData.js');
  const { exigirCodigoFinanceiro } = await import('./financeiroSeguranca.service.js');
  const state: any = { usuario_id: 'user', confirmado: true, segredo_criptografado: criptografarDado('JBSWY3DPEHPK3PXP'), ultimo_passo: -1, tentativas: 0, bloqueado_ate: null };
  let writes = 0;
  mock.method(supabase, 'from', (() => {
    let update: any;
    const filters: Array<[string, any]> = [];
    const query: any = {
      select: () => query,
      eq: (key: string, value: any) => { filters.push([key, value]); return query; },
      is: (key: string, value: any) => { filters.push([key, value]); return query; },
      update: (value: any) => { update = value; return query; },
      maybeSingle: async () => {
        if (!update) return { data: { ...state }, error: null };
        if (filters.some(([key, value]) => state[key] !== value)) return { data: null, error: null };
        writes++;
        Object.assign(state, update);
        return { data: { usuario_id: 'user' }, error: null };
      },
    };
    return query;
  }) as any);
  try {
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => exigirCodigoFinanceiro('user', 'invalid')));
    assert.ok(results.every(r => r.status === 'rejected'));
    assert.equal(writes, 5);
    assert.ok(new Date(state.bloqueado_ate).getTime() > Date.now());
    await assert.rejects(exigirCodigoFinanceiro('user', 'invalid'), /Aguarde 15 minutos/);
    assert.equal(writes, 5);
  } finally { mock.restoreAll(); }
});
