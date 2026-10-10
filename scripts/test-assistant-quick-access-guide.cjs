const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: name => { assert.ok(mocks[name], name); return mocks[name]; } });
  return exports;
}
const guide = load('services/assistant-app-guide.ts');
const local = load('services/local-assistant.ts', { './assistant-app-guide': guide });
for (const variant of ['gerador', 'consumidor']) {
  const reply = local.answerLocally('Como personalizar o acesso rápido?', { variant, authenticated: true });
  assert.equal(reply.kind, 'help');
  assert.match(reply.text, /Personalizar acesso rápido/);
  assert.match(reply.text, /permissões/);
  assert.match(reply.text, /nunca pela posição/);
  assert.match(guide.verifiedAppGuide(variant), /Mostrar Ajuda/);
}
assert.match(guide.guideAppAnswer('para que serve faturas emitidas', 'gerador'), /já geradas/);
assert.match(guide.guideAppAnswer('para que serve o atalho faturas emitidas', 'gerador'), /já geradas/);
assert.match(guide.guideAppAnswer('quais atalhos existem', 'gerador'), /Nova UC/);
assert.match(guide.guideAppAnswer('quais atalhos existem', 'consumidor'), /sem atalhos duplicados/);
assert.match(guide.guideAppAnswer('recebimento da usina', 'gerador'), /ativar um não significa ativar o outro/);
assert.match(guide.guideAppAnswer('anexar conta de luz', 'consumidor'), /UC selecionada/);
assert.match(guide.guideAppAnswer('compartilhar app', 'gerador'), /não cria conta/);
assert.match(guide.guideAppAnswer('clientes ativos', 'gerador'), /Comercial/);
assert.equal(guide.guideAppAnswer('faturas emitidas', 'consumidor'), undefined);
assert.match(fs.readFileSync(path.join(__dirname, '../services/assistant-gemini-live.ts'), 'utf8'), /verifiedAppGuide\(IS_GERADOR_APP/);
console.log('PASS: Solar conhece os atalhos, personalização, contextos e limites de acesso.');
