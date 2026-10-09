import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

test('colaborador não altera endereço da empresa por meio do próprio perfil', async () => {
  process.env.SUPABASE_URL ??= 'https://test.invalid';
  process.env.SUPABASE_SERVICE_KEY ??= 'test-placeholder';
  const { supabase } = await import('../../config/supabase.js');
  const { atualizarMeuPerfil } = await import('./auth.service.js');
  let writes = 0;
  mock.method(supabase, 'from', (() => {
    const query: any = { select: () => query, eq: () => query,
      single: async () => ({ data: { id: 'user', ativo: true, perfil: 'GESTOR', empresa_id: 'principal' }, error: null }),
      update: () => { writes++; return query; },
    };
    return query;
  }) as any);
  try {
    for (const papel of ['COLABORADOR_GERADOR', 'COLABORADOR_COMERCIAL', 'LEITURA']) {
      await assert.rejects(atualizarMeuPerfil('user', { nome: 'Pessoa Teste', email: 'teste@example.com', endereco: 'endereço', tipo: 'GERADOR' }, { empresa_id: 'principal', papel_empresa: papel }), /Somente o titular/);
    }
    assert.equal(writes, 0);
  } finally { mock.restoreAll(); }
});
