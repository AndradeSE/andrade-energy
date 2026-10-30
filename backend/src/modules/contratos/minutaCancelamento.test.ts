import assert from 'node:assert/strict';
import { test, mock } from 'node:test';

test('cancelar minuta enviada não gera cobrança e usa guarda contra assinatura concorrente', async () => {
  process.env.SUPABASE_URL = 'https://test.invalid'; process.env.SUPABASE_SERVICE_KEY = 'test-placeholder';
  const { supabase } = await import('../../config/supabase.js');
  const { cancelarMinutaSemAceite, minutaSemAceite } = await import('./minutaCancelamento.service.js');
  const user = { id: 'titular', empresa_id: 'empresa', perfil: 'ADMIN', papel_empresa: 'ADMIN_EMPRESA' };
  const original = { id: 'minuta', empresa_id: 'empresa', status: 'RASCUNHO', dados_documento: { envio_email_concluido: true } };
  assert.equal(minutaSemAceite(original), true);
  for (const changed of [{ status: 'VIGENTE' }, { aceite_cliente_em: 'hoje' }, { contrato_assinado_url: 'pdf' }, { assinado_em: 'hoje' }, { assinatura_cliente_hash: 'hash' }, { dados_documento: { assinatura_externa_pendente: true } }]) assert.equal(minutaSemAceite({ ...original, ...changed }), false);
  let record: any = original, concurrent = false, written: any = null;
  const filters: any[] = [], tables: string[] = [];
  mock.method(supabase, 'from', ((table: string) => {
    tables.push(table); let mutating = false;
    const q: any = { select: () => q, eq: (key: string, value: any) => { filters.push([key, value]); return q; }, is: (key: string, value: any) => { filters.push([key, value]); return q; },
      update: (value: any) => { mutating = true; written = value; return q; },
      maybeSingle: async () => ({ data: mutating ? concurrent ? null : { id: 'minuta' } : record, error: null }),
    }; return q;
  }) as any);
  try {
    await cancelarMinutaSemAceite('minuta', user);
    assert.equal(written.status, 'CANCELADO'); assert.equal(written.dados_documento.envio_email_concluido, true);
    assert.equal(written.dados_documento.minuta_cancelada_por, user.id);
    for (const key of ['aceite_cliente_em', 'contrato_assinado_url', 'assinado_em', 'assinatura_cliente_hash']) assert.ok(filters.some(([k, v]) => k === key && v === null));
    assert.ok(filters.some(([k,v]) => k === 'empresa_id' && v === user.empresa_id));
    assert.ok(filters.some(([k,v]) => k === 'status' && v === 'RASCUNHO'));
    assert.ok(tables.every(table => table === 'contratos'));
    concurrent = true; await assert.rejects(cancelarMinutaSemAceite('minuta', user), /alterada ou assinada/);
    record = { ...original, aceite_cliente_em: 'hoje' }; written = null;
    await assert.rejects(cancelarMinutaSemAceite('minuta', user), /sem aceite e sem assinatura/); assert.equal(written, null);
    record = null; await assert.rejects(cancelarMinutaSemAceite('minuta', user), /não encontrada nesta empresa/);
    for (const papel_empresa of ['COLABORADOR_GERADOR', 'LEITURA', '']) await assert.rejects(cancelarMinutaSemAceite('minuta', { ...user, papel_empresa }), /Somente o titular/);
    record = { ...original, status: 'CANCELADO', dados_documento: { minuta_cancelada_em: 'hoje' } };
    assert.equal((await cancelarMinutaSemAceite('minuta', user)).sucesso, true);
  } finally { mock.restoreAll(); }
});
