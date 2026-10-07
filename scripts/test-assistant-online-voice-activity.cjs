const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let now = 0, level = -160, timer, uploads = 0, empty = 0, final = '';
const api = { post: async () => { uploads++; return { data: { text: 'pergunta clara' } }; } };
const output = {};
const recorder = class {
  uri = 'file:///cache/speech.m4a';
  async prepareToRecordAsync() {}
  record() {}
  getStatus() { return { isRecording: true, durationMillis: now, metering: level }; }
  async stop() {}
  release() {}
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/assistant-online-speech.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports: output, console, AbortController, FormData: class { append() {} }, Blob,
  Date: { now: () => now }, setInterval: fn => { timer = fn; return 1; }, clearInterval: () => {},
  require: name => {
    if (name === 'expo-audio') return {
      AudioModule: { AudioRecorder: recorder }, RecordingPresets: { HIGH_QUALITY: { android: {} } },
      getRecordingPermissionsAsync: async () => ({ granted: true }),
      requestRecordingPermissionsAsync: async () => { throw new Error('Already granted'); },
      setAudioModeAsync: async () => {},
    };
    if (name === 'react-native') return { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } };
    if (name === 'expo-file-system') return { File: class { exists = true; size = 1000; delete() {} } };
    if (name === '../config/api') return { default: api };
    if (name === '../config/environment') return { isPreviewEnvironment: true };
    throw new Error(name);
  },
});
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
const start = () => output.startOnlineSpeech(text => { final = text; }, error => { throw new Error(error); }, undefined, () => { empty++; }, {
  valid: () => true, dictation: false, wakeMode: true,
});
(async () => {
  await start();
  now = 150; level = -33; timer(); // Um estalo isolado não é fala.
  now = 300; level = -160; timer();
  now = 5_100; timer();
  await flush();
  assert.equal(uploads, 0);
  assert.equal(empty, 1);
  await start();
  for (const elapsed of [5_250, 5_400, 5_550]) { now = elapsed; level = -25; timer(); }
  now = 6_500; level = -160; timer();
  await flush();
  assert.equal(uploads, 1);
  assert.equal(final, 'pergunta clara');
  console.log('PASS: ruído isolado não é enviado; fala sustentada é transcrita');
})().catch(error => { console.error(error); process.exitCode = 1; });
