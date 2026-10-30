import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

test('editar cadastros não transfere sua identidade ou empresa por payload', async () => {
  process.env.SUPABASE_URL ??= 'https://test.invalid';
  process.env.SUPABASE_SERVICE_KEY ??= 'test-placeholder';
  const { supabase } = await import('../../config/supabase.js');
  const { editarUsina } = await import('./usinas.repository.js');
  const { atualizarCliente } = await import('../clientes/clientes.repository.js');
  const writes: any[] = [];
  mock.method(supabase, 'from', (() => {
    const query: any = { select: () => query, eq: () => query,
      update: (dados: any) => { writes.push(dados); return query; },
      single: async () => ({ data: {}, error: null }),
    };
    return query;
  }) as any);
  try {
    const payload = { id: 'id-atacante', empresa_id: 'empresa-alheia', nome: 'Nome permitido' };
    await editarUsina('usina-propria', payload, 'empresa-propria');
    await atualizarCliente('cliente-proprio', payload, 'empresa-propria');
    for (const write of writes) assert.deepEqual(write, { nome: 'Nome permitido' });
  } finally { mock.restoreAll(); }
});

test('cliente não recebe vínculo com usina de outra empresa', async () => {
  process.env.SUPABASE_URL ??= 'https://test.invalid';
  process.env.SUPABASE_SERVICE_KEY ??= 'test-placeholder';
  const { supabase } = await import('../../config/supabase.js');
  const { atualizarCliente } = await import('../clientes/clientes.repository.js');
  let writes = 0;
  mock.method(supabase, 'from', (() => {
    const query: any = { select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
      update: () => { writes++; return query; },
    }; return query;
  }) as any);
  try {
    await assert.rejects(atualizarCliente('proprio', { usina_id: 'alheia' }, 'empresa-propria'), /não encontrado para esta empresa/);
    assert.equal(writes, 0);
  } finally { mock.restoreAll(); }
});

test('cadastrar usina com número de UC existente não sobrescreve a UC alheia', async () => {
  process.env.SUPABASE_URL ??= 'https://test.invalid';
  process.env.SUPABASE_SERVICE_KEY ??= 'test-placeholder';
  const { supabase } = await import('../../config/supabase.js');
  const { criarUsinaService } = await import('./usinas.service.js');
  let sobrescreveu = false;
  mock.method(supabase, 'from', ((table: string) => {
    const query: any = { select: () => query, eq: () => query, delete: () => query, insert: () => query,
      upsert: () => { sobrescreveu = true; return query; },
      single: async () => ({ data: { id: 'nova', numero_instalacao: '854652001898' }, error: null }),
      then: (resolve: any) => Promise.resolve({ error: table === 'unidades_consumidoras' && !sobrescreveu ? { code: '23505' } : null }).then(resolve),
    }; return query;
  }) as any);
  try {
    await assert.rejects(criarUsinaService({ nome: 'Teste', numero_instalacao: '854652001898' }, 'empresa-propria'), (erro: any) => erro.code === '23505');
    assert.equal(sobrescreveu, false);
  } finally { mock.restoreAll(); }
});

test('cadastro manual de UC usa empresa da sessão e rejeita vínculos externos', async () => {
  process.env.SUPABASE_URL ??= 'https://test.invalid';
  process.env.SUPABASE_SERVICE_KEY ??= 'test-placeholder';
  const { supabase } = await import('../../config/supabase.js');
  const { cadastrarUnidadeOperacional } = await import('./unidadeOperacional.service.js');
  const writes: any[] = [];
  mock.method(supabase, 'from', (() => {
    const filters: Array<[string, any]> = [];
    const query: any = { select: () => query,
      eq: (campo: string, valor: any) => { filters.push([campo, valor]); return query; },
      maybeSingle: async () => ({ data: filters.some(([campo, valor]) => campo === 'id' && valor === 'alheio') ? null : { id: 'proprio' }, error: null }),
      insert: (dados: any) => { writes.push(dados); return query; },
      single: async () => ({ data: { id: 'nova' }, error: null }),
    }; return query;
  }) as any);
  const payload = { id: 'forjado', empresa_id: 'outra', status: 'ATIVA', tipo: 'GERADORA', numero: '854652001898', modalidade_faturamento: 'INJECAO' };
  try {
    await assert.rejects(cadastrarUnidadeOperacional('alheio', payload, 'propria'), /não encontrado para esta empresa/);
    await assert.rejects(cadastrarUnidadeOperacional('proprio', { ...payload, cliente_id: 'alheio' }, 'propria'), /não encontrado para esta empresa/);
    assert.equal(writes.length, 0);
    await cadastrarUnidadeOperacional('proprio', payload, 'propria');
    assert.equal(writes[0].empresa_id, 'propria');
    assert.equal(writes[0].status, 'PENDENTE_CONTRATO');
    assert.equal(writes[0].id, undefined);
  } finally { mock.restoreAll(); }
});
