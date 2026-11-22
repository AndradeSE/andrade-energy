const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const ownerId = '00000000-0000-4000-8000-000000000001';
const admin = { id: 'admin', perfil: 'ADMIN', empresa_id: ownerId };

function fixture(overrides = {}) {
  const rows = [{ id: 'partner', nome: 'Parceira Teste', ativo: true, empresa_proprietaria: false, excluida_em: null, ...overrides }];
  const audits = []; const writes = [];
  const database = { from(table) {
    assert.equal(table, 'empresas');
    const filters = []; let patch;
    const q = {
      select() { return q; }, order() { return q; },
      eq(k,v) { filters.push(row => row[k] === v); return q; },
      is(k,v) { filters.push(row => row[k] === v); return q; },
      update(value) { patch = value; return q; },
      result(single) {
        const found = rows.filter(row => filters.every(filter => filter(row)));
        if (patch) { writes.push(patch); found.forEach(row => Object.assign(row, patch)); }
        return { data: single ? found[0] ?? null : found.map(row => ({...row})), error: null };
      },
      maybeSingle() { return Promise.resolve(q.result(true)); },
      single() { return Promise.resolve(q.result(true)); },
      then(resolve,reject) { return Promise.resolve(q.result(false)).then(resolve,reject); },
    }; return q;
  }};
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, 'empresas.service.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }}).outputText;
  vm.runInNewContext(code, { exports: module.exports, module, Date, console, require(id) {
    if (id === '../../config/supabase') return { supabase: database };
    if (id === '../../utils/audit') return { auditar: async event => audits.push(event) };
    if (id === '../../config/empresa') return {
      EMPRESA_ANDRADE_ID: ownerId,
      empresaIdDoUsuario: user => user?.empresa_id ?? ownerId,
      usuarioEhSuperAdministradorAndrade: user => user?.perfil === 'ADMIN' && !String(user?.papel_empresa ?? '').startsWith('COLABORADOR_') && (user?.empresa_principal_id ?? user?.empresa_id) === ownerId,
    };
    throw Error(id);
  }});
  return { api: module.exports, rows, audits, writes };
}

test('nega exclusão por parceiro e colaborador antes de escrever', async () => {
  for (const user of [{perfil:'GESTOR'}, {...admin,papel_empresa:'COLABORADOR_COMERCIAL'}, {...admin,empresa_id:'partner'}]) {
    const f = fixture(); await assert.rejects(f.api.excluirEmpresa('partner','Parceira Teste',user), /Somente/); assert.equal(f.writes.length,0);
  }
});
test('preserva empresa padrão e qualquer empresa proprietária', async () => {
  const f=fixture({empresa_proprietaria:true});
  await assert.rejects(f.api.excluirEmpresa(ownerId,'Andrade',admin), /proprietária/);
  await assert.rejects(f.api.excluirEmpresa('partner','Parceira Teste',admin), /proprietária/);
  assert.equal(f.writes.length,0);
});
test('impede excluir o ambiente em uso e confirmação divergente', async () => {
  const f=fixture();
  await assert.rejects(f.api.excluirEmpresa('partner','Parceira Teste',{...admin,empresa_principal_id:ownerId,empresa_id:'partner'}), /Troque/);
  await assert.rejects(f.api.excluirEmpresa('partner','Outra empresa',admin), /Digite o nome/);
  assert.equal(f.writes.length,0);
});
test('exclusão desativa, preserva registro, oculta na lista e registra auditoria', async () => {
  const f=fixture(); await f.api.excluirEmpresa('partner','Parceira Teste',admin);
  assert.equal(f.rows.length,1); assert.equal(f.rows[0].ativo,false); assert.ok(f.rows[0].excluida_em);
  assert.equal((await f.api.listarEmpresas(admin)).length,0);
  assert.equal(f.audits[0].acao,'EMPRESA_EXCLUIDA'); assert.equal(f.audits[0].recursoId,'partner');
  await assert.rejects(f.api.excluirEmpresa('partner','Parceira Teste',admin), /já excluída/);
  assert.equal(f.writes.length,1);
});
test('empresa apenas inativa continua listada, distinta de excluída', async () => {
  const f=fixture({ativo:false}); assert.equal((await f.api.listarEmpresas(admin)).length,1);
});
