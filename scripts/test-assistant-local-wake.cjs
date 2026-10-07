const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, imports = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => imports[name], Uint8Array, DataView, console,
    setTimeout, clearTimeout, setInterval, clearInterval,
  });
  return exports;
}
const segmenter = load('services/assistant-voice-phrases.ts');
const { AssistantLocalWake } = load('services/assistant-local-wake.ts', { './assistant-voice-phrases': segmenter });
const tick = () => new Promise(resolve => setImmediate(resolve));
function phrase() {
  const bytes = new Uint8Array(1600 * 32);
  const pcm = new DataView(bytes.buffer);
  for (let n = 0; n < 800 * 16; n++) pcm.setInt16(n * 2, Math.round(Math.sin(n / 7) * 2500), true);
  return bytes;
}
(async () => {
  let resolveTask;
  let cancelled = 0;
  const requests = [];
  const replies = [];
  const errors = [];
  const stream = {
    async initialize(config) { this.data = undefined; this.config = config; },
    onData(callback) { this.data = callback; }, onError(callback) { this.error = callback; },
    async start() { this.running = true; this.data({ data: new Uint8Array(640) }); },
    async stop() { this.running = false; }, async release() { this.data = undefined; },
  };
  const whisper = { transcribeData(audio, options) {
    requests.push({ audio, options });
    const promise = new Promise(resolve => { resolveTask = resolve; });
    return { promise, stop: async () => { cancelled++; resolveTask({ result: '', isAborted: true }); } };
  } };
  const listener = new AssistantLocalWake(stream, whisper);
  await listener.start(text => replies.push(text), text => errors.push(text), () => true);
  assert.equal(stream.config.audioSource, 1);
  assert.equal(stream.running, true);
  stream.data({ data: new Uint8Array(32000) });
  await tick();
  assert.equal(requests.length, 0, 'Silêncio não aciona Whisper');
  stream.data({ data: phrase() });
  await tick();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.language, 'pt');
  assert.equal(requests[0].options.maxContext, 0);
  resolveTask({ result: 'E aí, chat!', isAborted: false });
  await tick();
  assert.deepEqual(replies, ['E aí, chat!']);
  stream.data({ data: phrase() });
  await tick();
  assert.equal(requests.length, 2);
  await Promise.all([listener.stop(), listener.stop()]);
  assert.equal(cancelled, 1, 'Cancelar inferência uma vez mesmo com dois pedidos de parada');
  assert.equal(stream.running, false);
  assert.equal(replies.length, 1, 'Não entregar resultado cancelado');
  await listener.start(text => replies.push(text), text => errors.push(text), () => true);
  assert.equal(stream.running, true, 'Reativar após parar registra novamente o callback');
  await listener.stop();
  assert.deepEqual(errors, []);
  console.log('PASS: captura, frase única, silêncio sem inferência, cancelamento e reinício');
})().catch(error => { console.error(error); process.exitCode = 1; });
