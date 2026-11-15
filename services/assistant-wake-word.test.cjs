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
test('chamada funcional usa somente Solar', () => {
  for (const phrase of ['Solar', 'SOLAR!', '  solar  ', 'Soular', 'so lar']) {
    assert.equal(containsAssistantWakeWord(phrase), true, phrase);
  }
});
test('saudacoes e mencoes em outras frases nao ativam', () => {
  for (const phrase of ['', 'E ai Solar', 'E aí, Solar', 'Ola Solar', 'energia solar', 'eu disse solar', 'e isso e la']) {
    assert.equal(containsAssistantWakeWord(phrase), false, phrase);
  }
});
