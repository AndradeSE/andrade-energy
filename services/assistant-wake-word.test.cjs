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

test('captura rápida preserva a pausa entre E aí e Solar no mesmo trecho', async () => {
  function load(file, dependencies = {}) {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText, { exports, require: name => dependencies[name], Uint8Array, DataView,
      Date, Promise, setTimeout, clearTimeout, setInterval, clearInterval, console: { info() {} } });
    return exports;
  }
  const phrases = load('services/assistant-voice-phrases.ts');
  const { AssistantLocalWake } = load('services/assistant-local-wake.ts', { './assistant-voice-phrases': phrases });
  let onData;
  const frame = amplitude => {
    const bytes = new Uint8Array(640); const view = new DataView(bytes.buffer);
    for (let offset = 0; offset < bytes.length; offset += 2) view.setInt16(offset, amplitude, true);
    return bytes;
  };
  const captured = [];
  const stream = { initialize: async () => {}, onError() {}, onData: fn => { onData = fn; },
    start: async () => { onData({ data: frame(0) }); }, stop: async () => {}, release: async () => {} };
  const whisper = { transcribeData: audio => {
    captured.push(audio.byteLength);
    return { promise: Promise.resolve({ result: 'E aí, Solar', isAborted: false }), stop: async () => {} };
  } };
  const wake = new AssistantLocalWake(stream, whisper, true);
  const replies = [];
  try {
    await wake.start(text => replies.push(text), message => assert.fail(message), () => true);
    for (const [frames, amplitude] of [[12, 4000], [16, 0], [20, 4000], [26, 0]]) {
      for (let i = 0; i < frames; i++) onData({ data: frame(amplitude) });
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(captured.length, 1, 'a pausa de 320 ms não deve dividir a chamada');
    assert.ok(captured[0] >= (12 + 16 + 20 + 25) * 640);
    assert.deepEqual(replies, ['E aí, Solar']);
  } finally { await wake.stop(); }
});
