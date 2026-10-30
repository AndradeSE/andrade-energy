// Run after compiling the backend. No network or real customer mutations.
const { test } = require('node:test');
const assert = require('node:assert/strict');
let acessos = [];
let fatura;
const acessoPath = require.resolve('../dist/modules/contratos/acessoContrato.service');
require.cache[acessoPath] = { id: acessoPath, filename: acessoPath, loaded: true,
  exports: { listarAcessoContratos: async () => acessos } };
const supabasePath = require.resolve('../dist/config/supabase');
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true,
  exports: { supabase: { from: () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: fatura }) };
    return query;
  } } } };
const { exigirContratoDaUc } = require('../dist/middlewares/contratoAcesso.middleware');
async function requisitar({ query = {}, params = {}, perfil = 'LEITURA' } = {}) {
  let next = false;
  const res = { locals: {}, statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await exigirContratoDaUc({ usuario: { perfil, cliente_id: 'cliente', empresa_id: 'empresa' }, query, params, baseUrl: '/api/faturas' }, res, () => { next = true; });
  return { next, ...res };
}
test('middleware: autoriza apenas UC liberada solicitada', async () => {
  acessos = [{ id: 'a', numero: '111', liberado: true }, { id: 'b', numero: '222', liberado: false }];
  assert.equal((await requisitar({ query: { uc: '111' } })).next, true);
  assert.equal((await requisitar({ query: { uc: '222' } })).statusCode, 403);
  assert.equal((await requisitar({ query: { uc: 'outra' } })).statusCode, 403);
});
test('middleware: agregado entrega ao controlador somente UCs liberadas', async () => {
  acessos = [{ id: 'a', numero: '111', liberado: true }, { id: 'b', numero: '222', liberado: false }];
  const result = await requisitar();
  assert.equal(result.next, true);
  assert.deepEqual(result.locals.unidadesComContrato.map(u => u.id), ['a']);
});
test('middleware: fatura sem vínculo não herda liberação de outra UC', async () => {
  acessos = [{ id: 'a', numero: '111', liberado: true }];
  fatura = { numero_instalacao: '999', unidade_consumidora_id: null };
  assert.equal((await requisitar({ params: { id: 'f1' } })).statusCode, 403);
  fatura = { numero_instalacao: '111', unidade_consumidora_id: 'a' };
  assert.equal((await requisitar({ params: { id: 'f1' } })).next, true);
});
test('middleware: gestor não é bloqueado e consumidor sem UC é bloqueado', async () => {
  acessos = [];
  assert.equal((await requisitar({ perfil: 'GESTOR' })).next, true);
  assert.equal((await requisitar()).statusCode, 403);
});
