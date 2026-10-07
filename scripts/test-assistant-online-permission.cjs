const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let requests = 0, recordings = 0, granted = true, ready = 0;
const exportsForTest = {};
const audio = {
  getRecordingPermissionsAsync: async () => ({ granted }),
  requestRecordingPermissionsAsync: async () => { requests++; return { granted: false }; },
  setAudioModeAsync: async () => {},
  RecordingPresets: { HIGH_QUALITY: { android: {} } },
  AudioModule: { AudioRecorder: class {
    async prepareToRecordAsync() {}
    record() { recordings++; }
    getStatus() { return { isRecording: true }; }
    async stop() {}
    release() {}
  } },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/assistant-online-speech.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports: exportsForTest, console, AbortController, setInterval: () => 1, clearInterval: () => {},
  require: name => {
    if (name === 'expo-audio') return audio;
    if (name === 'react-native') return { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } };
    if (name === 'expo-file-system') return { File: class {} };
    if (name === '../config/api') return {};
    if (name === '../config/environment') return { isPreviewEnvironment: true };
    throw new Error(name);
  },
});
(async () => {
  const start = () => exportsForTest.startOnlineSpeech(() => {}, () => {}, undefined, undefined, {
    valid: () => true, dictation: false, wakeMode: true, onReady: () => ready++,
  });
  await start();
  await start();
  assert.equal(requests, 0, 'Permissão concedida não deve abrir nova solicitação entre trechos');
  assert.equal(recordings, 2);
  assert.equal(ready, 2);
  await exportsForTest.stopOnlineSpeech();
  granted = false;
  await assert.rejects(start, /Autorize o microfone/);
  assert.equal(requests, 1);
  assert.equal(recordings, 2, 'Sem permissão não pode gravar');
  console.log('PASS: permissão existente reutilizada, captura reiniciada e recusa respeitada');
})().catch(error => { console.error(error); process.exitCode = 1; });
