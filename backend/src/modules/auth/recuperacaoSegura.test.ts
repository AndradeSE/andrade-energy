import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

test('link de recuperação só altera uma senha sob concorrência e não reativa conta', async () => {
  process.env.SUPABASE_URL ??= 'https://test.invalid';
  process.env.SUPABASE_SERVICE_KEY ??= 'unit-test-placeholder';
  const { supabase } = await import('../../config/supabase.js');
  const { redefinirSenha } = await import('./auth.service.js');
  let used = false;
  const writes: any[] = [];
  mock.method(supabase, 'from', ((table: string) => {
    let update: any;
    const query: any = {
      select: () => query, eq: () => query, is: () => query, gt: () => query, delete: () => query,
      update: (value: any) => { update = value; return query; },
      maybeSingle: async () => {
        if (!update) return { data: { id: 'reset', usuario_id: 'user', usado_em: null, expira_em: new Date(Date.now() + 60000).toISOString() }, error: null };
        if (used) return { data: null, error: null };
        used = true;
        return { data: { id: 'reset' }, error: null };
      },
      then: (resolve: any) => {
        if (table === 'usuarios') writes.push(update);
        return Promise.resolve({ error: null }).then(resolve);
      },
    };
    return query;
  }) as any);
  try {
    const results = await Promise.allSettled([redefinirSenha('test-token', 'senha-primeira'), redefinirSenha('test-token', 'senha-segunda')]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.filter(r => r.status === 'rejected').length, 1);
    assert.equal(writes.length, 1);
    assert.ok(writes[0].senha.startsWith('$argon2id$'));
    assert.equal('ativo' in writes[0], false, 'recuperar senha não libera conta desativada ou pendente');
  } finally { mock.restoreAll(); }
});
