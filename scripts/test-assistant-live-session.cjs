const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const sockets = [];
const timers = new Set();
const playback = [];
const microphones = [];
const shortTimers = new Set();
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
  released = false;
  constructor() { microphones.push(this); }
  async initialize() {}
  isRecording() { return this.recording; }
  async start() { assert.equal(this.released, false, 'Android AudioRecord cannot restart after stop'); this.recording = true; }
  async stop() { this.recording = false; this.released = true; }
  async release() {}
  onError() {}
  onData(callback) { this.data = callback; }
}
const imports = {
  'react-native': { AppState: { addEventListener: () => ({ remove() {} }) } },
  'expo-audio': { getRecordingPermissionsAsync: async () => ({ granted: true }), setAudioModeAsync: async () => {} },
  'react-native-audio-api': { AudioContext: class {
    sampleRate = 48000;
    currentTime = 0;
    destination = {};
    async close() {}
    async resume() { playback.push('resume'); }
    createBuffer(channels, length, rate) { playback.push('buffer'); return { duration: length / rate, copyToChannel(samples) { assert.equal(samples.length, length); } }; }
    createBufferSource() { return { connect() {}, start() { playback.push('start'); } }; }
  } },
  'base64-js': require('base64-js'),
  'whisper.rn/realtime-transcription/adapters/AudioPcmStreamAdapter': { AudioPcmStreamAdapter: Microphone },
  '../config/api': { default: { post: async () => ({ data: { token: 'test-only', model: 'gemini-3.8-live' } }) } },
};
const moduleResult = { exports: {} };
const source = fs.readFileSync('services/assistant-gemini-live.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(js, { exports: moduleResult.exports, require: key => { assert.ok(imports[key], key); return imports[key]; }, WebSocket: Socket, setTimeout: (fn, ms) => { timers.add(fn); if (ms < 1000) shortTimers.add(fn); return fn; }, clearTimeout: fn => { timers.delete(fn); shortTimers.delete(fn); }, setInterval: fn => { timers.add(fn); return fn; }, clearInterval: fn => timers.delete(fn), Date, Promise, ArrayBuffer, Uint8Array, DataView, Float32Array });
(async () => {
  const failures = [];
  let releaseBeep;
  const session = await moduleResult.exports.startGeminiLive('Teste', { onState() {}, onFailure: value => failures.push(value), onLatestInvoice: async () => 'Última fatura fictícia: R$ 123,45, referência OUT/2026.', onAccountQuery: async () => 'sem dados fictícios', onReady: () => new Promise(resolve => { playback.push('beep'); releaseBeep = resolve; }) });
  const socket = sockets[0];
  assert.deepEqual(playback, ['beep'], 'Confirm command before waiting for the network setup');
  assert.equal(socket.binaryType, 'arraybuffer');
  const text = JSON.stringify({ setupComplete: {}, texto: 'produção e áudio' });
  const bytes = new TextEncoder().encode(text);
  assert.equal(moduleResult.exports.decodeLiveMessage(bytes.buffer), text);
  assert.equal(moduleResult.exports.decodeLiveMessage(bytes), text);
  assert.equal(moduleResult.exports.decodeLiveMessage(text), text);
  socket.onopen();
  const setup = socket.sent[0].setup;
  assert.ok(JSON.stringify(setup.systemInstruction).includes('123,45'));
  assert.ok(source.includes('IDLE_MS = 30_000'));
  assert.ok(source.includes('!awaitingResponseAt'));
  assert.deepEqual(Array.from(setup.generationConfig.responseModalities), ['AUDIO']);
  assert.equal(setup.responseModalities, undefined); // Wire schema, not the SDK config shape.
  assert.equal(setup.realtimeInputConfig.automaticActivityDetection.silenceDurationMs, 350);
  assert.equal(setup.inputAudioTranscription, undefined);
  assert.equal(setup.outputAudioTranscription, undefined);
  socket.onmessage({ data: bytes.buffer });
  assert.equal(socket.sent.length, 1); // Greeting must wait for the beep to finish.
  releaseBeep();
  for (let index = 0; index < 4; index++) await Promise.resolve();
  assert.equal(socket.sent[1].clientContent.turnComplete, true);
  socket.onmessage({ data: new TextEncoder().encode(JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'AAA=' } }] }, turnComplete: true } })).buffer });
  for (let index = 0; index < 12; index++) await Promise.resolve();
  assert.deepEqual(playback, ['beep', 'resume', 'buffer', 'start']);
  const finishPlayback = async () => {
    for (const timer of [...shortTimers]) { shortTimers.delete(timer); timers.delete(timer); timer(); }
    for (let i = 0; i < 15; i++) await Promise.resolve();
  };
  await finishPlayback();
  const mic = microphones[0];
  mic.data({ data: new Uint8Array(1280) });
  const firstPackets = socket.sent.filter(value => value.realtimeInput?.audio).length;
  assert.equal(firstPackets, 1);
  socket.onmessage({ data: JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: 'AAA=' } }] }, turnComplete: true } }) });
  for (let i = 0; i < 15; i++) await Promise.resolve();
  mic.data({ data: new Uint8Array(1280) });
  assert.equal(socket.sent.filter(value => value.realtimeInput?.audio).length, firstPackets, 'Discard assistant audio, avoiding echo');
  await finishPlayback();
  mic.data({ data: new Uint8Array(1280) });
  assert.equal(socket.sent.filter(value => value.realtimeInput?.audio).length, firstPackets + 1, 'Follow-up question must stream on the same microphone');
  assert.equal(mic.released, false);
  const pcm = Buffer.alloc(48000); // One second of 24 kHz mono PCM16.
  const samples = moduleResult.exports.livePcmSamples(pcm.toString('base64'), 24000, 48000);
  assert.equal(samples.length / 48000, 1); // Never replay at double speed.
  await session.stop();
  assert.equal(timers.size, 0);
  assert.equal(failures.length, 0); // Closing intentionally must not trigger fallback.
  const screen = fs.readFileSync('app/assistente.tsx', 'utf8');
  assert.ok(screen.includes('activateKeepAwakeAsync(tag)'));
  assert.ok(screen.includes('deactivateKeepAwake(tag)'));
  assert.ok(!screen.includes('else void toggleVoice(startFromCommand, false)'));
  console.log('PASS: Live wire setup, low-latency VAD, no transcription, cleanup and no silent fallback');
})().catch(error => { console.error(error); process.exitCode = 1; });
