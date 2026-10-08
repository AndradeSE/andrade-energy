const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sockets = [];
const timers = new Set();
const playback = [];
class Socket {
  static OPEN = 1;
  readyState = 1;
  sent = [];
  constructor() { sockets.push(this); }
  send(value) { this.sent.push(JSON.parse(value)); }
  close() { this.readyState = 3; this.onclose?.(); }
}
class Microphone {
  recording = false;
  async initialize() {}
  isRecording() { return this.recording; }
  async start() { this.recording = true; }
  async stop() { this.recording = false; }
  async release() {}
  onError() {}
  onData() {}
}
const imports = {
  'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
  'expo-audio': { getRecordingPermissionsAsync: async () => ({ granted: true }), setAudioModeAsync: async () => {} },
  'react-native-audio-api': { AudioContext: class {
    currentTime = 0;
    destination = {};
    async close() {}
    async resume() { playback.push('resume'); }
    async decodePCMInBase64() { playback.push('decode'); return { duration: 0.1 }; }
    createBufferSource() { return { connect() {}, start() { playback.push('start'); } }; }
  } },
  'base64-js': { fromByteArray: () => '' },
  'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter': { AudioPcmStreamAdapter: Microphone },
  '../config/api': { default: { post: async () => ({ data: { token: 'test-only', model: 'gemini-3.8-live' } }) } },
};
const moduleResult = { exports: {} };
const source = fs.readFileSync('services/assistant-gemini-live.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(js, { exports: moduleResult.exports, require: key => { assert.ok(imports[key], key); return imports[key]; }, WebSocket: Socket, setTimeout: fn => { timers.add(fn); return fn; }, clearTimeout: fn => timers.delete(fn), setInterval: fn => { timers.add(fn); return fn; }, clearInterval: fn => timers.delete(fn), Date, Promise, ArrayBuffer, Uint8Array });
(async () => {
  const failures = [];
  const session = await moduleResult.exports.startGeminiLive('Teste', { onState() {}, onFailure: value => failures.push(value), onAccountQuery: async () => 'sem dados fictícios' });
  const socket = sockets[0];
  assert.equal(socket.binaryType, 'arraybuffer');
  const text = JSON.stringify({ setupComplete: {}, texto: 'produção e áudio' });
  const bytes = new TextEncoder().encode(text);
  assert.equal(moduleResult.exports.decodeLiveMessage(bytes.buffer), text);
  assert.equal(moduleResult.exports.decodeLiveMessage(bytes), text);
  assert.equal(moduleResult.exports.decodeLiveMessage(text), text);
  socket.onopen();
  const setup = socket.sent[0].setup;
  assert.deepEqual(Array.from(setup.generationConfig.responseModalities), ['AUDIO']);
  assert.equal(setup.responseModalities, undefined); // Wire schema, not the SDK config shape.
  assert.equal(setup.realtimeInputConfig.automaticActivityDetection.silenceDurationMs, 350);
  assert.equal(setup.inputAudioTranscription, undefined);
  assert.equal(setup.outputAudioTranscription, undefined);
  socket.onmessage({ data: bytes.buffer });
  assert.equal(socket.sent[1].clientContent.turnComplete, true);
  socket.onmessage({ data: new TextEncoder().encode(JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'AAAA' } }] }, turnComplete: true } })).buffer });
  for (let index = 0; index < 12; index++) await Promise.resolve();
  assert.deepEqual(playback, ['resume', 'decode', 'start']);
  await session.stop();
  assert.equal(timers.size, 0);
  assert.equal(failures.length, 0); // Closing intentionally must not trigger fallback.
  const screen = fs.readFileSync('app/assistente.tsx', 'utf8');
  assert.ok(screen.includes('activateKeepAwakeAsync(tag)'));
  assert.ok(screen.includes('deactivateKeepAwake(tag)'));
  assert.ok(!screen.includes('else void toggleVoice(startFromCommand, false)'));
  console.log('PASS: Live wire setup, low-latency VAD, no transcription, cleanup and no silent fallback');
})().catch(error => { console.error(error); process.exitCode = 1; });
