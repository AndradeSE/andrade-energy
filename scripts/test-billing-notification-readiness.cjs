const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../backend/src/modules/faturas/notificacoesFatura.service.ts');
let invoice;
const notifications = [];
const records = {
  clientes: { nome: 'Cliente teste', email: null, whatsapp: null },
  usinas: { nome: 'Usina teste' },
  empresa_usuarios: [],
};
const supabase = { from(table) {
  const query = { then(resolve) { return Promise.resolve({ data: table === 'faturas' ? invoice : records[table], error: null }).then(resolve); } };
  for (const method of ['select', 'eq', 'in', 'single', 'maybeSingle']) query[method] = () => query;
  return query;
} };
const compiled = new Module(filename, module);
compiled.require = (name) => {
  if (name.endsWith('/supabase')) return { supabase };
  if (name.endsWith('/push.service')) return { criarNotificacaoApp: async (item) => notifications.push(item) };
  if (name.endsWith('/documentosFatura.service')) return { VERSAO_RELATORIO_CALCULO: 'teste' };
  if (name.endsWith('/microsoftEmail.service')) return {};
  if (name.endsWith('/destinatariosPermitidos')) return {};
  throw new Error(`Dependência inesperada: ${name}`);
};
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
async function run() {
  const base = { id: 'fatura-teste', cliente_id: 'cliente', empresa_id: 'empresa', usina_id: 'usina', status: 'ABERTA', valor_total: 100, referencia: '10/2026' };
  invoice = { ...base, codigo_pix: null, linha_digitavel: 'boleto' };
  await compiled.exports.enfileirarNotificacoesDaFatura(base);
  assert.equal(notifications.length, 0, 'Cobrança incompleta não deve ser anunciada');
  records.empresa_usuarios = [{ usuario_id: 'cliente' }];
  invoice = { ...base, codigo_pix: 'pix', linha_digitavel: 'boleto' };
  await compiled.exports.enfileirarNotificacoesDaFatura({ ...base, status: 'RASCUNHO' });
  assert(notifications.some(n => n.tipo === 'FATURA_DISPONIVEL'));
  assert(notifications.some(n => n.tipo === 'CLIENTE_FATURADO' && n.detalhe.includes('Usina teste')));
  notifications.length = 0;
  records.empresa_usuarios = [{ usuario_id: 'colaborador', papel: 'COLABORADOR_GERADOR', permissoes: { faturamento: false } }];
  await compiled.exports.notificarGeradorDoClienteFaturado(invoice);
  assert.equal(notifications.length, 0, 'Colaborador sem permissão não recebe aviso financeiro');
  console.log('PASS: cobrança incompleta bloqueada, dados atuais consultados, avisos cliente/gerador e permissões');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
