import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

process.env.SUPABASE_URL = 'https://test.invalid';
process.env.SUPABASE_SERVICE_KEY = 'test-placeholder';
process.env.EMAIL_DESTINATARIOS_PERMITIDOS = '';

async function setup() {
const { EMPRESA_ANDRADE_ID } = await import('../../config/empresa.js');
const { supabase } = await import('../../config/supabase.js');
const service = await import('../colaboradores/colaboradores.service.js');
const owner = { id: 'titular', empresa_id: EMPRESA_ANDRADE_ID, perfil: 'ADMIN', papel_empresa: 'ADMIN_EMPRESA' };
return { EMPRESA_ANDRADE_ID, supabase, service, owner };
}

test('titular Andrade gerencia equipe geradora e comercial sem conceder isso a colaboradores', async () => {
  const { service, owner } = await setup();
  assert.deepEqual(service.papeisDaEquipePermitidos(owner), ['COLABORADOR_GERADOR', 'COLABORADOR_COMERCIAL']);
  assert.deepEqual(service.papeisDaEquipePermitidos({ ...owner, empresa_id: 'outra' }), ['COLABORADOR_GERADOR']);
  assert.deepEqual(service.papeisDaEquipePermitidos({ ...owner, perfil: 'GESTOR', papel_empresa: 'GESTOR' }), ['COLABORADOR_GERADOR']);
  for (const papel_empresa of ['COLABORADOR_GERADOR', 'COLABORADOR_COMERCIAL', 'LEITURA', '', 'ADMIN']) {
    assert.deepEqual(service.papeisDaEquipePermitidos({ ...owner, papel_empresa }), []);
  }
  assert.deepEqual(service.papeisDaEquipePermitidos({ ...owner, perfil: 'LEITURA' }), []);
  assert.deepEqual(service.papeisDaEquipePermitidos({ ...owner, empresa_id: '' }), []);
});

test('convite gerador da Andrade e listagem usam empresa autenticada e permissões operacionais', async () => {
  const { service, owner, supabase, EMPRESA_ANDRADE_ID } = await setup();
  const writes: any[] = []; const filters: any[] = [];
  mock.method(supabase, 'from', ((table: string) => {
    let inserted: any;
    const q: any = {
      select: () => q, eq: (key: string, value: any) => { filters.push([table, key, value]); return q; },
      in: (key: string, value: any) => { filters.push([table, key, value]); return q; },
      order: () => q, limit: () => q,
      update: (data: any) => { writes.push({ table, data }); return q; },
      insert: (data: any) => { inserted = data; writes.push({ table, data }); return q; },
      single: async () => ({ data: { id: 'convite-teste', ...inserted }, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
    }; return q;
  }) as any);
  try {
    const result = await service.criarConviteColaborador({ nome: 'Pessoa Teste', cpf: '12345678901', email: 'teste@example.invalid', papel: 'COLABORADOR_GERADOR', empresa_id: 'forjada', permissoes: { clientes: false, carteira: true } }, owner);
    assert.equal(result.convite.empresa_id, EMPRESA_ANDRADE_ID);
    assert.equal(result.convite.papel, 'COLABORADOR_GERADOR');
    assert.equal(result.convite.permissoes.clientes, false);
    assert.equal('carteira' in result.convite.permissoes, false);
    assert.equal(result.emailEnviado, false);
    assert.ok(result.token?.startsWith('colaborador_'));
    await service.listarColaboradores(owner);
    assert.ok(filters.some((entry) => entry[0] === 'convites_colaboradores' && entry[1] === 'papel' && entry[2].includes('COLABORADOR_GERADOR')));
    const before = writes.length;
    for (const usuario of [{ ...owner, papel_empresa: 'COLABORADOR_GERADOR' }, { ...owner, papel_empresa: 'LEITURA' }]) {
      await assert.rejects(service.criarConviteColaborador({ papel: 'COLABORADOR_GERADOR' }, usuario), /não pode convidar/);
      await assert.rejects(service.listarColaboradores(usuario), /exclusiva do titular/);
      await assert.rejects(service.cancelarConviteColaborador('outro', usuario), /exclusiva do titular/);
    }
    for (const papel of ['ADMIN_EMPRESA', 'QUALQUER']) await assert.rejects(service.criarConviteColaborador({ papel }, owner), /não pode convidar/);
    await assert.rejects(service.criarConviteColaborador({ papel: 'COLABORADOR_COMERCIAL' }, { ...owner, empresa_id: 'outra' }), /não pode convidar/);
    assert.equal(writes.length, before);
  } finally { mock.restoreAll(); }
});
