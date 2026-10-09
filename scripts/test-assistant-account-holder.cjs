const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const apiCalls = [];
const exported = {};
const code = ts.transpileModule(fs.readFileSync('services/assistant-live-account.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const deps = {
  './local-assistant': { normalizeAssistantQuery: text => text.toLowerCase() },
  './clientes.service': {
    buscarUnidade: async id => { apiCalls.push(['unit', id]); return { numero: '123', titular: 'Titular Ficticio', cliente_id: 'client-selected' }; },
    buscarCliente: async id => { apiCalls.push(['client', id]); return { nome: 'Cliente Ficticio' }; },
  },
};
vm.runInNewContext(code, { exports: exported, require: name => deps[name] ?? {} });
(async () => {
  const empty = await exported.queryLiveAccount('Nome do titular', { generator: false });
  assert.match(empty.text, /Qual UC/);
  assert.equal(apiCalls.length, 0);
  const reply = await exported.queryLiveAccount('Nome do titular e nome do cliente', { generator: false, unitId: 'unit-selected' });
  assert.match(reply.text, /Titular Ficticio/);
  assert.match(reply.text, /Cliente Ficticio/);
  assert.deepEqual(apiCalls, [['unit', 'unit-selected'], ['client', 'client-selected']]);
  console.log('PASS: titular e cliente distintos, IDs provenientes da UC selecionada e ausência de seleção sem consulta');
})().catch(error => { console.error(error); process.exitCode = 1; });
