const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/assistant-wake-word.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject, Date, Set });
const { containsAssistantWakeWord } = exportsObject;

test('ativa somente a chamada E aí Solar, normalizando a transcrição', () => {
  for (const phrase of ['E aí, Solar!', 'e ai solar', ' E   AÍ   SOLAR ', 'eai solar', 'e ai soular', 'e ai so lar']) {
    assert.equal(containsAssistantWakeWord(phrase), true, phrase);
  }
});
test('não ativa com nome isolado, conversa ambiente ou frases incompletas', () => {
  for (const phrase of ['', 'Solar', 'e ai', 'energia solar', 'e ai solar como está', 'eu disse e ai solar', 'e ai sol', 'e a entrada']) {
    assert.equal(containsAssistantWakeWord(phrase), false, phrase);
  }
});
